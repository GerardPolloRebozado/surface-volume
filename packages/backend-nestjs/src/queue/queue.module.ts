import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE } from './queue.constants';
import { WorkflowQueue } from './workflow.queue';
import { bullmqTelemetry } from './queue.telemetry';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE, telemetry: bullmqTelemetry })],
  providers: [WorkflowQueue],
  exports: [BullModule, WorkflowQueue],
})
export class QueueModule {}
