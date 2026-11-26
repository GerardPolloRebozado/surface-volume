import { Injectable } from '@nestjs/common';
import type { ActionPlan } from '../workflow/action-plan';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowQueue } from '../queue/workflow.queue';
import { ExecutorService } from '../workflow/executor.service';
import { jsonOutputs, jsonValue, type ActionResult } from '../workflow/execution-result';
import { resolveInputs } from '../workflow/inputs';
import {
  findNode,
  planContinuations,
  type PlannerWindow,
} from '../workflow/planner';
import { RunContextService } from '../workflow/run-context';
import { RunsService } from '../workflow/runs.service';
import { ConnectionsService } from '../connections/connections.service';
import { backendMetrics } from '../telemetry/metrics';
import { withSpan } from '../telemetry/tracing';

export type RunOutcome =
  | {
      status: 'succeeded' | 'failed';
      runStatus: string;
      continuations: number;
      retried?: boolean;
    }
  | { reason: 'cancelled' | 'already_running' | 'done' | 'not_found' };

export type ClaimOutcome = RunOutcome | { stepId: string; plan: ActionPlan };

export interface StepResultBody {
  status: string;
  outputs?: Record<string, unknown>;
  errorKind?: ActionResult['errorKind'];
  errorMessage?: string;
  retryAfterMs?: number;
}

interface Prepared {
  step: {
    id: string;
    runId: string;
    nodeId: string;
    seq: number;
    iteration: number;
    attempts: number;
    inputs: unknown;
    status: string;
    run: { id: string; versionId: string; workflowId: string; status: string };
  };
  node: ReturnType<typeof findNode>;
  window: PlannerWindow;
  outputsByNode: Record<string, Record<string, unknown>>;
}

@Injectable()
export class StepRunnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexts: RunContextService,
    private readonly executor: ExecutorService,
    private readonly queue: WorkflowQueue,
    private readonly runs: RunsService,
    private readonly connections: ConnectionsService,
  ) {}

  async claim(stepId: string, attempt: number): Promise<ClaimOutcome> {
    return withSpan(
      'StepRunnerService.claim',
      { 'step.id': stepId, 'step.attempt': attempt },
      () => this.claimInner(stepId, attempt),
    );
  }

  private async claimInner(stepId: string, attempt: number): Promise<ClaimOutcome> {
    const step = await this.prisma.runStep.findUnique({
      where: { id: stepId },
      include: { run: true },
    });

    if (!step) return { reason: 'not_found' };
    if (step.run.status === 'cancelled') return { reason: 'cancelled' };
    if (step.status !== 'pending') {
      return { reason: step.status === 'running' ? 'already_running' : 'done' };
    }

    const claimed = await this.prisma.runStep.updateMany({
      where: { id: stepId, status: 'pending' },
      data: {
        status: 'running',
        attempts: { increment: 1 },
        startedAt: new Date(),
      },
    });
    if (claimed.count === 0) return { reason: 'already_running' };

    if (step.run.status === 'queued') {
      await this.prisma.workflowRun.update({
        where: { id: step.runId },
        data: { status: 'running', startedAt: new Date() },
      });
    }

    const prepared = await this.prepare(step);
    const node = prepared.node;
    const inputs = this.resolveInputs(prepared);
    const context = await this.contexts.build({
      workflowId: step.run.workflowId,
      nodeId: step.nodeId,
      runId: step.runId,
      connectionId: node && 'credentialId' in node ? node.credentialId : undefined,
      inputs,
    });

    const result: ActionResult =
      node?.type === 'action'
        ? await this.executor.runAction(node, inputs, context)
        : { status: 'succeeded', outputs: {} };

    if (result.status === 'planned' && result.plan) {
      return { stepId, plan: result.plan };
    }

    return this.finish(prepared, result, attempt);
  }

  async result(stepId: string, attempt: number, body: StepResultBody): Promise<RunOutcome> {
    return withSpan(
      'StepRunnerService.result',
      { 'step.id': stepId, 'step.attempt': attempt, 'step.status': body.status },
      () => this.resultInner(stepId, attempt, body),
    );
  }

  private async resultInner(
    stepId: string,
    attempt: number,
    body: StepResultBody,
  ): Promise<RunOutcome> {
    const step = await this.prisma.runStep.findUnique({
      where: { id: stepId },
      include: { run: true },
    });

    if (!step) return { reason: 'not_found' };
    if (step.status !== 'running') {
      return { reason: step.status === 'pending' ? 'already_running' : 'done' };
    }

    const result: ActionResult = {
      status: body.status === 'failed' ? 'failed' : 'succeeded',
      outputs: body.outputs ?? {},
      errorKind: body.errorKind,
      errorMessage: body.errorMessage,
      retryAfterMs: body.retryAfterMs,
    };

    return this.finish(await this.prepare(step), result, attempt);
  }

  private async prepare(step: {
    id: string;
    runId: string;
    nodeId: string;
    seq: number;
    iteration: number;
    attempts: number;
    inputs: unknown;
    status: string;
    run: { id: string; versionId: string; workflowId: string; status: string };
  }): Promise<Prepared> {
    const version = await this.prisma.workflowVersion.findUniqueOrThrow({
      where: { id: step.run.versionId },
    });
    const window = version.definition as unknown as PlannerWindow;

    const previous = await this.prisma.runStep.findMany({
      where: { runId: step.runId, status: 'succeeded' },
    });
    const outputsByNode: Record<string, Record<string, unknown>> = {};
    for (const item of previous) {
      if (
        item.outputs &&
        typeof item.outputs === 'object' &&
        !Array.isArray(item.outputs)
      ) {
        outputsByNode[item.nodeId] = item.outputs as Record<string, unknown>;
      }
    }

    return {
      step,
      node: findNode(window, step.nodeId),
      window,
      outputsByNode,
    };
  }

  private resolveInputs(prepared: Prepared): Record<string, unknown> {
    const saved =
      prepared.step.inputs &&
      typeof prepared.step.inputs === 'object' &&
      !Array.isArray(prepared.step.inputs)
        ? (prepared.step.inputs as Record<string, unknown>)
        : {};
    const node = prepared.node;
    const nodeInputs =
      node && 'inputs' in node ? (node.inputs as Record<string, unknown>) : {};

    return resolveInputs({ ...saved, ...nodeInputs }, prepared.outputsByNode);
  }

  private async finish(
    prepared: Prepared,
    result: ActionResult,
    attempt: number,
  ): Promise<RunOutcome> {
    const startedAt = Date.now();
    return withSpan(
      'StepRunnerService.finish',
      {
        'step.id': prepared.step.id,
        'run.id': prepared.step.runId,
        'workflow.id': prepared.step.run.workflowId,
        'step.node_id': prepared.step.nodeId,
        'step.attempt': attempt,
      },
      async (span) => {
        const outcome = await this.finishInner(prepared, result, attempt);
        const status = 'status' in outcome ? outcome.status : outcome.reason;
        span.setAttribute('step.outcome', status);
        const labels = {
          status,
          error_kind: result.errorKind ?? 'none',
          attempt: String(attempt),
        };
        backendMetrics.stepsFinished.add(1, labels);
        backendMetrics.stepDuration.record((Date.now() - startedAt) / 1000, labels);
        return outcome;
      },
    );
  }

  private async finishInner(
    prepared: Prepared,
    result: ActionResult,
    attempt: number,
  ): Promise<RunOutcome> {
    const { step, node, window, outputsByNode } = prepared;
    if (result.status === 'planned') return { reason: 'done' };
    const inputs = this.resolveInputs(prepared);

    const credentialId = node && 'credentialId' in node ? node.credentialId : undefined;
    if (
      result.status === 'failed' &&
      result.errorKind === 'auth_expired' &&
      credentialId
    ) {
      await this.connections.markCredentialRejected(
        credentialId,
        result.errorMessage ?? 'The provider rejected the credentials',
      );
    }

    const onError = node && 'onError' in node ? node.onError : undefined;
    const strategy = result.status === 'failed' ? (onError?.strategy ?? 'stop') : 'stop';
    const shouldRetry =
      result.status === 'failed' &&
      strategy === 'retry' &&
      attempt < (onError?.maxRetries ?? 3);
    const retryDelayMs = Math.min(
      result.retryAfterMs ?? 1000 * 2 ** (attempt - 1),
      30_000,
    );
    const effectiveStatus: 'succeeded' | 'failed' =
      result.status === 'failed' && strategy === 'continue'
        ? 'succeeded'
        : result.status;

    const continuations =
      effectiveStatus === 'succeeded' && !shouldRetry
        ? planContinuations(window, step.nodeId, {
            iteration: step.iteration,
            values: outputsByNode,
          })
        : [];
    const branchTaken = continuations.find((c) => c.branchTaken)?.branchTaken;
    const conditionEval = continuations.find((c) => c.conditionEval)?.conditionEval;

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.stepAttempt.create({
        data: {
          step: { connect: { id: step.id } },
          attemptNo: attempt,
          status: result.status === 'succeeded' ? 'succeeded' : 'failed',
          errorKind: result.errorKind,
          errorMessage: result.errorMessage,
          retryAfter: shouldRetry ? new Date(Date.now() + retryDelayMs) : null,
          finishedAt: new Date(),
        },
      });

      if (shouldRetry) {
        await tx.runStep.update({
          where: { id: step.id },
          data: {
            status: 'pending',
            errorKind: result.errorKind,
            errorMessage: result.errorMessage,
            finishedAt: new Date(),
          },
        });
        return [];
      }

      await tx.runStep.update({
        where: { id: step.id },
        data: {
          status: effectiveStatus,
          inputs: jsonOutputs(inputs),
          ...(effectiveStatus === 'succeeded'
            ? { outputs: jsonOutputs(result.outputs) }
            : {}),
          errorKind: result.errorKind,
          errorMessage: result.errorMessage,
          branchTaken: branchTaken ?? null,
          conditionEval: conditionEval === undefined ? undefined : jsonValue(conditionEval),
          finishedAt: new Date(),
        },
      });

      if (effectiveStatus === 'failed' && strategy === 'stop') {
        await tx.runStep.updateMany({
          where: { runId: step.runId, status: 'pending' },
          data: { status: 'not_reached' },
        });
        return [];
      }

      const steps = [];
      for (const continuation of continuations) {
        const createdStep = await tx.runStep.create({
          data: {
            run: { connect: { id: step.runId } },
            nodeId: continuation.nodeId,
            nodeType: findNode(window, continuation.nodeId)?.type ?? 'action',
            seq: step.seq + 1,
            iteration: continuation.iteration,
            status: 'pending',
            ...(continuation.loopItem === undefined
              ? {}
              : {
                  inputs: jsonValue({
                    loop: { item: continuation.loopItem, index: continuation.iteration - 1 },
                  }),
                }),
          },
        });
        steps.push(createdStep);
      }
      return steps;
    });

    if (shouldRetry) {
      await this.queue.enqueueStep({
        stepId: step.id,
        attempt: attempt + 1,
        delayMs: retryDelayMs,
      });
      return {
        status: 'failed',
        runStatus: step.run.status,
        continuations: 0,
        retried: true,
      };
    }

    for (const next of created) {
      await this.queue.enqueueStep({
        stepId: next.id,
        attempt: 1,
        delayMs: continuations.find((c) => c.nodeId === next.nodeId)?.delayMs,
      });
    }

    const completed = await this.runs.completeIfDone(
      step.runId,
      effectiveStatus,
      effectiveStatus === 'failed'
        ? {
            nodeId: step.nodeId,
            errorKind: result.errorKind,
            errorMessage: result.errorMessage,
          }
        : undefined,
    );

    return {
      status: effectiveStatus,
      runStatus: completed ?? step.run.status,
      continuations: created.length,
    };
  }
}
