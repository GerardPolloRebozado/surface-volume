import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowQueue } from '../queue/workflow.queue';
import { ExecutorService } from '../workflow/executor.service';
import { jsonOutputs, type ActionResult } from '../workflow/execution-result';
import { resolveInputs } from '../workflow/inputs';
import { findNode, planContinuations, type PlannerWindow } from '../workflow/planner';
import { RunContextService } from '../workflow/run-context';
import { RunsService } from '../workflow/runs.service';

export type RunOutcome =
  | { status: 'succeeded' | 'failed'; runStatus: string; continuations: number }
  | { reason: 'cancelled' | 'already_running' | 'done' | 'not_found' };

@Injectable()
export class StepRunnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexts: RunContextService,
    private readonly executor: ExecutorService,
    private readonly queue: WorkflowQueue,
    private readonly runs: RunsService,
  ) {}

  async run(stepId: string, attempt: number): Promise<RunOutcome> {
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

    const version = await this.prisma.workflowVersion.findUniqueOrThrow({
      where: { id: step.run.versionId },
    });
    const window = version.definition as unknown as PlannerWindow;
    const node = findNode(window, step.nodeId);

    const previous = await this.prisma.runStep.findMany({
      where: { runId: step.runId, status: 'succeeded' },
    });
    const outputsByNode: Record<string, Record<string, unknown>> = {};
    for (const item of previous) {
      if (item.outputs && typeof item.outputs === 'object' && !Array.isArray(item.outputs)) {
        outputsByNode[item.nodeId] = item.outputs as Record<string, unknown>;
      }
    }

    const rawInputs =
      node && 'inputs' in node
        ? (node.inputs as Record<string, unknown>)
        : {};
    const inputs = resolveInputs(rawInputs, outputsByNode);

    const context = await this.contexts.build({
      workflowId: step.run.workflowId,
      nodeId: step.nodeId,
      connectionId: node && 'credentialId' in node ? node.credentialId : undefined,
      inputs,
    });

    const result: ActionResult =
      node?.type === 'action'
        ? await this.executor.runAction(node, inputs, context)
        : { status: 'succeeded' as const, outputs: {} };

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.runStep.update({
        where: { id: stepId },
        data: {
          status: result.status,
          inputs: jsonOutputs(inputs),
          ...(result.status === 'succeeded'
            ? { outputs: jsonOutputs(result.outputs) }
            : {}),
          errorKind: result.errorKind,
          errorMessage: result.errorMessage,
          finishedAt: new Date(),
        },
      });

      await tx.stepAttempt.create({
        data: {
          step: { connect: { id: stepId } },
          attemptNo: attempt,
          status: result.status,
          errorKind: result.errorKind,
          errorMessage: result.errorMessage,
          finishedAt: new Date(),
        },
      });

      if (result.status !== 'succeeded') return [];

      const steps = [];
      for (const continuation of planContinuations(window, step.nodeId, step.iteration)) {
        const createdStep = await tx.runStep.create({
          data: {
            run: { connect: { id: step.runId } },
            nodeId: continuation.nodeId,
            nodeType: findNode(window, continuation.nodeId)?.type ?? 'action',
            seq: step.seq + 1,
            iteration: continuation.iteration,
            status: 'pending',
          },
        });
        steps.push(createdStep);
      }
      return steps;
    });

    for (const next of created) {
      await this.queue.enqueueStep({ stepId: next.id, attempt: 1 });
    }

    const completed = await this.runs.completeIfDone(
      step.runId,
      result.status,
      result.status === 'failed'
        ? {
            nodeId: step.nodeId,
            errorKind: result.errorKind,
            errorMessage: result.errorMessage,
          }
        : undefined,
    );

    const runStatus = completed ?? step.run.status;

    return {
      status: result.status,
      runStatus,
      continuations: created.length,
    };
  }
}
