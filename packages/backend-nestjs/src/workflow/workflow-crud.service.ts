import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { findApp, findTrigger } from '../apps';
import { ConnectionCryptoService } from '../connections/connection-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowQueue } from '../queue/workflow.queue';
import {
  assertRunnable,
  DefinitionError,
  validateDefinition,
  type ValidatedDefinition,
} from './definition';
import { nextRunAt } from '../scheduler/next-run';
import type { Link, WorkflowNode } from './workflow.types';
import { RunsService } from './runs.service';

interface WorkflowRow {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: string;
  statusReason: string | null;
  latestVersionId: string | null;
  activeVersionId: string | null;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DefinitionView {
  trigger: {
    id: string;
    appId: string;
    triggerKey: string;
    credentialId?: string;
    inputs: Record<string, unknown>;
  };
  nodes: WorkflowNode[];
  links: Link[];
}

const EMPTY_DEFINITION: DefinitionView = {
  trigger: { id: 'trigger', appId: '', triggerKey: '', inputs: {} },
  nodes: [],
  links: [],
};

@Injectable()
export class WorkflowCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: ConnectionCryptoService,
    private readonly queue: WorkflowQueue,
    private readonly runs: RunsService,
  ) {}

  async list(userId: string) {
    const workflows = await this.prisma.workflow.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return Promise.all(
      workflows.map(async (workflow) => {
        const definition = await this.definition(workflow);
        const [lastRun, recent] = await Promise.all([
          this.prisma.workflowRun.findFirst({
            where: { workflowId: workflow.id },
            orderBy: { queuedAt: 'desc' },
          }),
          this.prisma.workflowRun.findMany({
            where: { workflowId: workflow.id, queuedAt: { gte: from } },
            select: { queuedAt: true },
          }),
        ]);
        const buckets = Array.from({ length: 7 }, () => 0);
        for (const item of recent) {
          const days = Math.floor((now.getTime() - item.queuedAt.getTime()) / 86_400_000);
          const index = 6 - days;
          if (index >= 0 && index < 7) buckets[index] += 1;
        }
        return {
          workflow: this.resource(workflow, definition.value, definition.version),
          services: this.services(definition.value),
          lastRun: lastRun ? this.run(lastRun) : null,
          runsLast7Days: buckets,
        };
      }),
    );
  }

  async get(userId: string, id: string) {
    const workflow = await this.own(userId, id);
    const definition = await this.definition(workflow);
    return this.resource(workflow, definition.value, definition.version);
  }

  async create(userId: string, name: string, description?: string) {
    const workflow = await this.prisma.workflow.create({
      data: { userId, name, description: description ?? null },
    });
    return this.resource(workflow, EMPTY_DEFINITION, 0);
  }

  async save(
    userId: string,
    id: string,
    name: string,
    description: string | undefined,
    rawDefinition: unknown,
  ) {
    const workflow = await this.own(userId, id);
    const definition = this.parsed(rawDefinition, false);
    const previous = workflow.latestVersionId
      ? await this.prisma.workflowVersion.findUniqueOrThrow({
          where: { id: workflow.latestVersionId },
        })
      : undefined;

    const version = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workflowVersion.create({
        data: {
          workflowId: id,
          version: (previous?.version ?? 0) + 1,
          definition: rawDefinition as object,
          createdById: userId,
        },
      });
      await tx.workflowConnection.deleteMany({ where: { workflowId: id } });
      for (const connectionId of this.connectionIds(definition)) {
        await tx.workflowConnection.create({
          data: { workflowId: id, connectionId, nodeId: this.nodeFor(definition, connectionId) },
        });
      }
      await tx.workflow.update({
        where: { id },
        data: {
          name,
          description: description ?? workflow.description,
          latestVersionId: created.id,
        },
      });
      return created;
    });

    return this.resource(
      {
        ...workflow,
        name,
        description: description ?? workflow.description,
        latestVersionId: version.id,
      },
      definition,
      version.version,
    );
  }

  async enable(userId: string, id: string) {
    const workflow = await this.own(userId, id);
    if (!workflow.latestVersionId) {
      throw new BadRequestException('Save a definition before enabling the workflow');
    }
    const version = await this.prisma.workflowVersion.findUniqueOrThrow({
      where: { id: workflow.latestVersionId },
    });
    const definition = this.parsed(version.definition);
    await this.assertCredentials(userId, definition);

    const triggerDefinition = findTrigger(
      definition.trigger.appId,
      definition.trigger.triggerKey,
    );
    if (!triggerDefinition) {
      throw new BadRequestException('The workflow trigger is not installed');
    }
    if (triggerDefinition.type === 'schedule') {
      throw new BadRequestException('Schedule triggers are not available yet');
    }

    const inputs = definition.trigger.inputs;
    const intervalSec =
      triggerDefinition.type === 'polling'
        ? Math.max(15, Number(inputs.intervalSec) || triggerDefinition.defaultIntervalSec)
        : undefined;
    const cron = triggerDefinition.type === 'polling' && typeof inputs.cron === 'string' ? inputs.cron : null;
    const due = nextRunAt({ cron, intervalSec });

    const existing = await this.prisma.workflowTrigger.findUnique({
      where: { workflowId: id },
    });
    const secret = triggerDefinition.type === 'webhook' ? randomBytes(32).toString('hex') : undefined;
    const encrypted = secret ? this.crypto.encrypt({ secret }) : undefined;
    const data = {
      versionId: version.id,
      appId: definition.trigger.appId,
      triggerKey: definition.trigger.triggerKey,
      type: triggerDefinition.type,
      connectionId: definition.trigger.credentialId ?? null,
      inputs: definition.trigger.inputs as object,
      intervalSec,
      cron,
      nextRunAt: triggerDefinition.type === 'polling' ? due : null,
      enabled: true,
      webhookToken: existing?.webhookToken ?? (secret ? randomBytes(24).toString('hex') : null),
      webhookSecretEnc: encrypted
        ? new Uint8Array(encrypted.credentialsEnc)
        : existing?.webhookSecretEnc,
      keyVersion: encrypted?.keyVersion ?? existing?.keyVersion,
      lastError: null,
      consecutiveFailures: 0,
    };

    const trigger = existing
      ? await this.prisma.workflowTrigger.update({ where: { id: existing.id }, data })
      : await this.prisma.workflowTrigger.create({ data: { workflowId: id, ...data } });

    await this.prisma.workflow.update({
      where: { id },
      data: { status: 'on', activeVersionId: version.id, statusReason: null },
    });

    if (triggerDefinition.type === 'polling' && trigger.nextRunAt) {
      await this.queue.enqueuePoll(trigger.id, trigger.nextRunAt);
    }

    return this.resource(
      { ...workflow, status: 'on', activeVersionId: version.id },
      definition,
      version.version,
    );
  }

  async disable(userId: string, id: string) {
    const workflow = await this.own(userId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.workflowTrigger.updateMany({
        where: { workflowId: id },
        data: { enabled: false, nextRunAt: null },
      });
      await tx.workflow.update({
        where: { id },
        data: { status: 'off', statusReason: null },
      });
    });
    const definition = await this.definition(workflow);
    return this.resource({ ...workflow, status: 'off' }, definition.value, definition.version);
  }

  async runNow(userId: string, id: string) {
    const workflow = await this.own(userId, id);
    if (!workflow.latestVersionId) {
      throw new BadRequestException('Save a definition before running the workflow');
    }
    const version = await this.prisma.workflowVersion.findUniqueOrThrow({
      where: { id: workflow.latestVersionId },
    });
    const definition = this.parsed(version.definition);
    await this.assertCredentials(userId, definition);

    const run = await this.runs.createFromEvent({
      workflowId: id,
      versionId: version.id,
      userId,
      mode: 'manual',
      window: definition,
      event: {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        data: { source: 'manual', at: new Date().toISOString() },
        occurredAt: new Date().toISOString(),
      },
    });
    await this.prisma.workflow.update({
      where: { id },
      data: { lastRunAt: new Date() },
    });
    return { runId: run.id };
  }

  async remove(userId: string, id: string): Promise<void> {
    const workflow = await this.own(userId, id);
    await this.prisma.workflow.delete({ where: { id: workflow.id } });
  }

  private parsed(raw: unknown, runnable = true): ValidatedDefinition {
    try {
      const definition = validateDefinition(raw);
      if (runnable) assertRunnable(definition);
      return definition;
    } catch (error) {
      if (error instanceof DefinitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async assertCredentials(userId: string, definition: ValidatedDefinition) {
    for (const { connectionId, appId } of this.connectionRefs(definition)) {
      const connection = await this.prisma.connection.findFirst({
        where: { id: connectionId, userId },
        select: { appId: true, status: true },
      });
      if (!connection || connection.appId !== appId) {
        throw new BadRequestException(`Connection ${connectionId} is not valid for ${appId}`);
      }
      if (connection.status !== 'active') {
        throw new BadRequestException(`Connection ${appId} needs to be reconnected`);
      }
    }
  }

  private connectionRefs(definition: ValidatedDefinition) {
    const refs: { connectionId: string; appId: string }[] = [];
    if (definition.trigger.credentialId) {
      refs.push({ connectionId: definition.trigger.credentialId, appId: definition.trigger.appId });
    }
    for (const node of definition.nodes) {
      if (node.type === 'action' && 'credentialId' in node && node.credentialId) {
        refs.push({ connectionId: String(node.credentialId), appId: node.appId });
      }
    }
    return refs;
  }

  private connectionIds(definition: ValidatedDefinition): string[] {
    return [...new Set(this.connectionRefs(definition).map((ref) => ref.connectionId))];
  }

  private nodeFor(definition: ValidatedDefinition, connectionId: string): string {
    if (definition.trigger.credentialId === connectionId) return definition.trigger.id;
    const node = definition.nodes.find(
      (item) => 'credentialId' in item && item.credentialId === connectionId,
    );
    return node?.id ?? 'trigger';
  }

  private services(definition: DefinitionView): string[] {
    const ids = new Set<string>();
    if (definition.trigger.appId) ids.add(definition.trigger.appId);
    for (const node of definition.nodes) {
      if (node.type === 'action') ids.add(node.appId);
    }
    return [...ids].map((id) => findApp(id)?.name ?? id);
  }

  private async definition(workflow: WorkflowRow): Promise<{ value: DefinitionView; version: number }> {
    if (!workflow.latestVersionId) return { value: EMPTY_DEFINITION, version: 0 };
    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: workflow.latestVersionId },
    });
    return {
      value: (version?.definition ?? EMPTY_DEFINITION) as DefinitionView,
      version: version?.version ?? 0,
    };
  }

  private resource(workflow: WorkflowRow, definition: DefinitionView, version: number) {
    return {
      id: workflow.id,
      userId: workflow.userId,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      statusReason: workflow.statusReason,
      version,
      trigger: definition.trigger,
      nodes: definition.nodes,
      links: definition.links,
      createdAt: workflow.createdAt.toISOString(),
      updatedAt: workflow.updatedAt.toISOString(),
      lastRunAt: workflow.lastRunAt?.toISOString() ?? null,
    };
  }

  private run(row: {
    id: string;
    workflowId: string;
    versionId: string;
    mode: string;
    status: string;
    queuedAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    errorNodeId: string | null;
    errorKind: string | null;
    errorMessage: string | null;
  }) {
    return {
      id: row.id,
      workflowId: row.workflowId,
      versionId: row.versionId,
      mode: row.mode,
      status: row.status,
      queuedAt: row.queuedAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      finishedAt: row.finishedAt?.toISOString() ?? null,
      errorNodeId: row.errorNodeId,
      errorKind: row.errorKind,
      errorMessage: row.errorMessage,
    };
  }

  private async own(userId: string, id: string): Promise<WorkflowRow> {
    const workflow = await this.prisma.workflow.findFirst({ where: { id, userId } });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow as WorkflowRow;
  }
}
