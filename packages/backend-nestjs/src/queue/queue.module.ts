import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE } from './queue.constants';
import { WorkflowQueue } from './workflow.queue';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE })],
  providers: [WorkflowQueue],
  exports: [BullModule, WorkflowQueue],
})
export class QueueModule {}
