import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CronExpressionParser } from 'cron-parser';

interface ClaimedWorkflow {
  id: string;
  nextRunAt: Date;
}

@Injectable()
export class ScheduleService {
  private isPolling = false;
  private readonly logger = new Logger(ScheduleService.name);
  constructor(
    @InjectQueue('triggers-to-check') private readonly triggersToCheck: Queue,
    private readonly prisma: PrismaService,
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
      const interval = CronExpressionParser.parse(t.cron);
      await this.prisma.workflowTrigger.update({
        where: { id: t.id },
        data: {
          nextRunAt: interval.next().toDate(),
        },
      });
    }
  }

  @Cron('*/15 * * * *')
  async triggersToQueue() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.$queryRaw<ClaimedWorkflow[]>`
              WITH due AS (
                SELECT id, "nextRunAt"
                FROM "WorkflowTrigger"
                WHERE "nextRunAt" IS NOT NULL
                  AND "nextRunAt" <= NOW()
                ORDER BY "nextRunAt" ASC
                LIMIT 100
                FOR UPDATE SKIP LOCKED
              )
              UPDATE "Workflow" AS w
              SET "nextRunAt" = NULL
              FROM due
              WHERE w.id = due.id
              RETURNING w.id, due."nextRunAt";
            `;

        if (claimed.length === 0) return;

        const jobs = claimed.map((wf) => ({
          name: 'trigger-workflow',
          data: {
            workflowId: wf.id,
            scheduledFor: wf.nextRunAt.toISOString(),
          },
          opts: {
            jobId: `wf_${wf.id}_${new Date(wf.nextRunAt).getTime()}`,
            removeOnComplete: true,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        }));

        await this.triggersToCheck.addBulk(jobs);
      });
    } catch (error) {
      this.logger.error('Failed to poll due workflows', error);
    } finally {
      this.isPolling = false;
    }
  }
}
