import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE } from './queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE })],
  exports: [BullModule],
})
export class QueueModule {}
