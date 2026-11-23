import { CronExpressionParser } from 'cron-parser';
import type { WorkflowTrigger } from '../generated/prisma/client';

export function nextRunAt(
  trigger: Pick<WorkflowTrigger, 'cron' | 'intervalSec'>,
  from: Date = new Date(),
): Date {
  if (trigger.cron) {
    return CronExpressionParser.parse(trigger.cron, { currentDate: from })
      .next()
      .toDate();
  }

  return new Date(from.getTime() + (trigger.intervalSec ?? 60) * 1000);
}
