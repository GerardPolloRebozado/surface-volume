import { InjectQueue } from '@nestjs/bullmq';
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { JOBS, QUEUE } from './queue.constants';
import { pollJobId, stepJobId } from './job-ids';
import { backendMetrics } from '../telemetry/metrics';
import { withSpan } from '../telemetry/tracing';
import { traceCarrier } from '../telemetry/propagation';

export interface EnqueueStepInput {
  stepId: string;
  attempt: number;
  priority?: number;
  delayMs?: number;
}

@Injectable()
export class WorkflowQueue implements OnModuleInit, OnModuleDestroy {
  private depthTimer?: NodeJS.Timeout;

  constructor(@InjectQueue(QUEUE) private readonly queue: Queue) {}

  onModuleInit(): void {
    // One backend instance; a single poller is enough. Recorded as OTel gauges
    // so Prometheus shows queue depth alongside the runner fleet.
    this.depthTimer = setInterval(() => {
      void this.queue
        .getJobCounts('waiting', 'active', 'delayed')
        .then((counts) => {
          backendMetrics.queueWaiting.record(counts.waiting ?? 0);
          backendMetrics.queueActive.record(counts.active ?? 0);
          backendMetrics.queueDelayed.record(counts.delayed ?? 0);
        })
        .catch(() => {
          // Redis being down is already visible through the health check.
        });
    }, 10_000);
    this.depthTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.depthTimer) clearInterval(this.depthTimer);
  }

  async enqueueStep(input: EnqueueStepInput) {
    const jobId = stepJobId(input.stepId, input.attempt);
    return withSpan(
      'WorkflowQueue.enqueueStep',
      { 'job.id': jobId, 'step.id': input.stepId, 'step.attempt': input.attempt },
      async (span) => {
        if (await this.queue.getJob(jobId)) {
          span.setAttribute('job.deduplicated', true);
          return;
        }

        backendMetrics.queueEnqueued.add(1, { job_name: JOBS.runStep });
        return this.queue.add(
          JOBS.runStep,
          {
            stepId: input.stepId,
            attempt: input.attempt,
            trace: traceCarrier(),
          },
          {
            jobId,
            attempts: 2,
            priority: input.priority ?? 5,
            delay: input.delayMs,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { age: 3600, count: 1000 },
            removeOnFail: { age: 86400, count: 5000 },
          },
        );
      },
    );
  }

  async enqueuePoll(triggerId: string, dueAt: Date) {
    const jobId = pollJobId(triggerId, dueAt);
    return withSpan(
      'WorkflowQueue.enqueuePoll',
      { 'job.id': jobId, 'trigger.id': triggerId },
      async (span) => {
        if (await this.queue.getJob(jobId)) {
          span.setAttribute('job.deduplicated', true);
          return;
        }

        backendMetrics.queueEnqueued.add(1, { job_name: JOBS.poll });
        return this.queue.add(
          JOBS.poll,
          { triggerId, dueAt: dueAt.toISOString(), trace: traceCarrier() },
          {
            jobId,
            priority: 1,
            delay: Math.max(0, dueAt.getTime() - Date.now()),
            attempts: 2,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { age: 3600, count: 1000 },
            removeOnFail: { age: 86400, count: 5000 },
          },
        );
      },
    );
  }
}
