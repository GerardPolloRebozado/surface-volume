import type { Prisma } from '../generated/prisma/client';

export interface TriggerEventData {
  id: string;
  data: Record<string, unknown>;
  occurredAt?: string;
}

export function triggerStepData(event: TriggerEventData) {
  return {
    nodeId: 'trigger',
    nodeType: 'trigger',
    seq: 0,
    iteration: 0,
    status: 'succeeded' as const,
    inputs: {},
    outputs: event.data as Prisma.InputJsonValue,
    startedAt: new Date(),
    finishedAt: new Date(),
  };
}
