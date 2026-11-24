import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { findTrigger } from '../apps';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowQueue } from '../queue/workflow.queue';
import { nextRunAt } from '../scheduler/next-run';
import { RunContextService } from '../workflow/run-context';
import { RunsService } from '../workflow/runs.service';
import type { PlannerWindow } from '../workflow/planner';
import type {
  PollingPlan,
  PollingTrigger,
  TriggerEvent,
} from '../workflow/triggers.types';
import { externalIdForEvent } from './event-id';

export type PollOutcome =
  | { events: number; nextRunAt: string }
  | { reason: 'not_found' | 'disabled' | 'leased' };

export type PollClaim =
  | { triggerId: string; plan: PollingPlan }
  | PollOutcome;

export interface PollSubmit {
  outputs?: Record<string, unknown>;
  errorKind?: string;
  errorMessage?: string;
  retryAfterMs?: number;
}

@Injectable()
export class TriggersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexts: RunContextService,
    private readonly runs: RunsService,
    private readonly queue: WorkflowQueue,
  ) {}

  async claim(triggerId: string, dueAt: string): Promise<PollClaim> {
    const trigger = await this.prisma.workflowTrigger.findUnique({
      where: { id: triggerId },
    });
    if (!trigger) return { reason: 'not_found' };
    if (!trigger.enabled) return { reason: 'disabled' };

    const claimed = await this.prisma.workflowTrigger.updateMany({
      where: {
        id: triggerId,
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
      },
      data: {
        leaseUntil: new Date(Date.now() + 60_000),
        leaseOwner: `worker-${process.pid}`,
      },
    });
    if (claimed.count === 0) return { reason: 'leased' };

    const definition = findTrigger(trigger.appId, trigger.triggerKey);
    if (!definition || definition.type !== 'polling') {
      await this.prisma.workflowTrigger.update({
        where: { id: triggerId },
        data: { enabled: false, leaseUntil: null, leaseOwner: null },
      });
      return { reason: 'not_found' };
    }
    const polling = definition as PollingTrigger;

    const context = await this.contexts.build({
      workflowId: trigger.workflowId,
      nodeId: 'trigger',
      connectionId: trigger.connectionId,
      inputs: trigger.inputs as Record<string, unknown>,
    });

    if (polling.plan) {
      const plan = await polling.plan(context);
      return { triggerId, plan };
    }

    if (!polling.poll) {
      await this.prisma.workflowTrigger.update({
        where: { id: triggerId },
        data: { enabled: false, leaseUntil: null, leaseOwner: null },
      });
      return { reason: 'not_found' };
    }

    try {
      const events = await polling.poll(context);
      return await this.finish(trigger, events);
    } catch (error) {
      return this.fail(trigger, error, dueAt);
    }
  }

  async submit(
    triggerId: string,
    dueAt: string,
    body: PollSubmit,
  ): Promise<PollOutcome> {
    const trigger = await this.prisma.workflowTrigger.findUnique({
      where: { id: triggerId },
    });
    if (!trigger) return { reason: 'not_found' };

    if (body.errorKind || body.errorMessage) {
      return this.fail(trigger, new Error(body.errorMessage ?? body.errorKind), dueAt, body.retryAfterMs);
    }

    const definition = findTrigger(trigger.appId, trigger.triggerKey);
    const polling = definition?.type === 'polling' ? (definition as PollingTrigger) : undefined;
    if (!polling?.map) return { reason: 'not_found' };

    const context = await this.contexts.build({
      workflowId: trigger.workflowId,
      nodeId: 'trigger',
      connectionId: trigger.connectionId,
      inputs: trigger.inputs as Record<string, unknown>,
    });

    try {
      const events = await polling.map(body.outputs ?? {}, context);
      return await this.finish(trigger, events);
    } catch (error) {
      return this.fail(trigger, error, dueAt);
    }
  }

  async ingestEvents(
    trigger: { id: string; workflowId: string; versionId: string },
    events: TriggerEvent[],
    window: PlannerWindow,
  ): Promise<number> {
    const workflow = await this.prisma.workflow.findUniqueOrThrow({
      where: { id: trigger.workflowId },
    });
    const byExternalId = new Map<string, TriggerEvent>();
    let inserted = 0;

    for (const event of events) {
      const externalId = externalIdForEvent(event);
      const rows = await this.prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO trigger_events (id, trigger_id, external_id, payload, occurred_at)
        VALUES (
          ${randomUUID()}::uuid,
          ${trigger.id}::uuid,
          ${externalId},
          ${JSON.stringify(event.data)}::jsonb,
          COALESCE(${event.occurredAt ?? null}::timestamptz, NOW())
        )
        ON CONFLICT (trigger_id, external_id) DO NOTHING
        RETURNING id
      `;
      if (rows.length > 0) {
        inserted += 1;
        byExternalId.set(externalId, event);
      }
    }

    for (const [externalId, event] of byExternalId) {
      await this.runs.createFromEvent({
        workflowId: trigger.workflowId,
        versionId: trigger.versionId,
        userId: workflow.userId,
        mode: 'live',
        event: {
          id: externalId,
          data: event.data,
          occurredAt: event.occurredAt,
        },
        window,
      });
    }

    return inserted;
  }

  private async finish(
    trigger: {
      id: string;
      workflowId: string;
      versionId: string;
      consecutiveFailures: number;
      cron: string | null;
      intervalSec: number | null;
    },
    events: TriggerEvent[],
  ): Promise<PollOutcome> {
    const version = await this.prisma.workflowVersion.findUniqueOrThrow({
      where: { id: trigger.versionId },
    });
    const inserted = await this.ingestEvents(
      trigger,
      events,
      version.definition as unknown as PlannerWindow,
    );

    const next = nextRunAt(trigger, new Date());
    await this.prisma.workflowTrigger.update({
      where: { id: trigger.id },
      data: {
        nextRunAt: next,
        lastCheckedAt: new Date(),
        consecutiveFailures: 0,
        lastError: null,
        leaseUntil: null,
        leaseOwner: null,
      },
    });
    await this.queue.enqueuePoll(trigger.id, next);

    return { events: inserted, nextRunAt: next.toISOString() };
  }

  private async fail(
    trigger: {
      id: string;
      consecutiveFailures: number;
    },
    error: unknown,
    dueAt: string,
    retryAfterMs?: number,
  ): Promise<PollOutcome> {
    const wait = retryAfterMs ?? Math.min(
      60_000 * 2 ** trigger.consecutiveFailures,
      3_600_000,
    );
    const next = nextRunAt(
      { cron: null, intervalSec: null },
      new Date(Date.now() + wait),
    );
    await this.prisma.workflowTrigger.update({
      where: { id: trigger.id },
      data: {
        nextRunAt: next,
        consecutiveFailures: { increment: 1 },
        lastCheckedAt: new Date(),
        lastError: error instanceof Error ? error.message : String(error),
        leaseUntil: null,
        leaseOwner: null,
      },
    });
    await this.queue.enqueuePoll(trigger.id, next);

    return { events: 0, nextRunAt: next.toISOString() };
  }
}
