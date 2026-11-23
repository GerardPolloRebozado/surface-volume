import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { UsersModule } from '../users/users.module';
import { ScheduleService } from '../scheduler/schedule.service';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [QueueModule, UsersModule],
  providers: [ScheduleService, WorkflowService],
})
export class WorkflowsModule {}
