import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { JOBS, QUEUE } from '../queue/queue.constants';
import { pollJobId } from '../queue/job-ids';
import { WorkflowQueue } from '../queue/workflow.queue';
import { nextRunAt } from './next-run';

interface ClaimedTrigger {
  id: string;
  next_run_at: Date;
}

@Injectable()
export class ScheduleService {
  private isPolling = false;
  private readonly logger = new Logger(ScheduleService.name);
  constructor(
    @InjectQueue(QUEUE) private readonly workflowQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly producer: WorkflowQueue,
  ) {}

  @Cron('* * * * *')
  async triggersToSchedule() {
    const triggers = await this.prisma.workflowTrigger.findMany({
      where: {
        enabled: true,
        type: 'polling',
        nextRunAt: null,
      },
    });
    for (const t of triggers) {
      await this.prisma.workflowTrigger.update({
        where: { id: t.id },
        data: {
          nextRunAt: nextRunAt(t),
        },
      });
    }
  }

  @Cron('*/15 * * * *')
  async triggersToQueue() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const claimed = await this.prisma.$transaction((tx) =>
        tx.$queryRaw<ClaimedTrigger[]>`
          WITH due AS (
            SELECT id, next_run_at
            FROM workflow_triggers
            WHERE next_run_at IS NOT NULL
              AND next_run_at <= NOW()
              AND enabled = true
            ORDER BY next_run_at ASC
            LIMIT 100
            FOR UPDATE SKIP LOCKED
          )
          UPDATE workflow_triggers AS t
          SET next_run_at = NULL
          FROM due
          WHERE t.id = due.id
          RETURNING t.id, due.next_run_at;
        `,
      );

      if (claimed.length === 0) return;

      const jobs = claimed.map((trigger) => ({
        name: JOBS.poll,
        data: {
          triggerId: trigger.id,
          dueAt: trigger.next_run_at.toISOString(),
        },
        opts: {
          jobId: pollJobId(trigger.id, trigger.next_run_at),
          priority: 1,
          delay: Math.max(0, trigger.next_run_at.getTime() - Date.now()),
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400, count: 5000 },
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }));

      await this.workflowQueue.addBulk(jobs);
    } catch (error) {
      this.logger.error('Failed to poll due workflows', error);
    } finally {
      this.isPolling = false;
    }
  }

  @Cron('*/30 * * * *')
  async repair() {
    try {
      const now = new Date();
      const due = await this.prisma.workflowTrigger.findMany({
        where: { enabled: true, nextRunAt: { lte: now } },
        take: 100,
      });
      for (const trigger of due) {
        await this.producer.enqueuePoll(trigger.id, trigger.nextRunAt!);
      }

      const stale = await this.prisma.runStep.findMany({
        where: {
          status: 'running',
          startedAt: { lt: new Date(now.getTime() - 300_000) },
        },
        take: 100,
      });
      for (const step of stale) {
        await this.prisma.runStep.update({
          where: { id: step.id },
          data: {
            status: 'pending',
            errorKind: 'retryable',
            errorMessage: 'step lease expired',
          },
        });
        await this.producer.enqueueStep({
          stepId: step.id,
          attempt: step.attempts + 1,
        });
      }

      const pending = await this.prisma.runStep.findMany({
        where: {
          status: 'pending',
          run: { queuedAt: { lt: new Date(now.getTime() - 120_000) } },
        },
        take: 100,
      });
      for (const step of pending) {
        await this.producer.enqueueStep({
          stepId: step.id,
          attempt: step.attempts + 1,
        });
      }
    } catch (error) {
      this.logger.error('Failed to repair queued work', error);
    }
  }
}
