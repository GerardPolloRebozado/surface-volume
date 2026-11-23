import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JOBS, QUEUE } from './queue.constants';
import { pollJobId, stepJobId } from './job-ids';

export interface EnqueueStepInput {
  stepId: string;
  attempt: number;
  priority?: number;
  delayMs?: number;
}

@Injectable()
export class WorkflowQueue {
  constructor(@InjectQueue(QUEUE) private readonly queue: Queue) {}

  async enqueueStep(input: EnqueueStepInput) {
    const jobId = stepJobId(input.stepId, input.attempt);
    if (await this.queue.getJob(jobId)) return;

    return this.queue.add(
      JOBS.runStep,
      { stepId: input.stepId, attempt: input.attempt },
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
  }

  async enqueuePoll(triggerId: string, dueAt: Date) {
    const jobId = pollJobId(triggerId, dueAt);
    if (await this.queue.getJob(jobId)) return;

    return this.queue.add(
      JOBS.poll,
      { triggerId, dueAt: dueAt.toISOString() },
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
  }
}
