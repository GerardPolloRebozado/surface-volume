import { Injectable } from '@nestjs/common';
import type { ErrorKind } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowQueue } from '../queue/workflow.queue';
import { findNode, planContinuations, type PlannerWindow } from './planner';
import { triggerStepData, type TriggerEventData } from './run-steps';
import { completionStatus } from './run-completion';

interface Failure {
  nodeId: string;
  errorKind?: ErrorKind;
  errorMessage?: string;
}

type RunMode = 'live' | 'test' | 'manual' | 'retry';

interface CreateRunInput {
  workflowId: string;
  versionId: string;
  userId: string;
  mode?: RunMode;
  event: TriggerEventData;
  window: PlannerWindow;
}

@Injectable()
export class RunsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: WorkflowQueue,
  ) {}

  async createFromEvent(input: CreateRunInput) {
    const { run, steps } = await this.prisma.$transaction(async (tx) => {
      const run = await tx.workflowRun.create({
        data: {
          workflowId: input.workflowId,
          versionId: input.versionId,
          userId: input.userId,
          mode: input.mode ?? 'live',
          status: 'queued',
        },
      });

      await tx.runStep.create({
        data: {
          run: { connect: { id: run.id } },
          ...triggerStepData(input.event),
        },
      });

      const steps = [];
      for (const [index, continuation] of planContinuations(input.window, 'trigger', {
        iteration: 0,
        values: { trigger: input.event.data },
      }).entries()) {
        const step = await tx.runStep.create({
          data: {
            run: { connect: { id: run.id } },
            nodeId: continuation.nodeId,
            nodeType: findNode(input.window, continuation.nodeId)?.type ?? 'action',
            seq: index + 1,
            iteration: continuation.iteration,
            status: 'pending',
          },
        });
        steps.push(step);
      }

      return { run, steps };
    });

    for (const step of steps) {
      await this.queue.enqueueStep({ stepId: step.id, attempt: 1 });
    }

    return run;
  }

  async completeIfDone(
    runId: string,
    outcome: 'succeeded' | 'failed' | null,
    failure?: Failure,
  ) {
    const remaining = await this.prisma.runStep.count({
      where: { runId, status: { in: ['pending', 'running'] } },
    });
    const status = completionStatus(outcome, remaining);
    if (!status) return null;

    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status,
        finishedAt: new Date(),
        ...(status === 'failed' && failure
          ? {
              errorNodeId: failure.nodeId,
              errorKind: failure.errorKind,
              errorMessage: failure.errorMessage,
            }
          : {}),
      },
    });

    return status;
  }
}
