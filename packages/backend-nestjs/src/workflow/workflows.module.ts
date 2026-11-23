import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { UsersModule } from '../users/users.module';
import { ConnectionsModule } from '../connections/connections.module';
import { ScheduleService } from '../scheduler/schedule.service';
import { WorkflowService } from './workflow.service';
import { RunsService } from './runs.service';
import { RunContextService } from './run-context';
import { ExecutorService } from './executor.service';

@Module({
  imports: [QueueModule, UsersModule, ConnectionsModule],
  providers: [
    ScheduleService,
    WorkflowService,
    RunsService,
    RunContextService,
    ExecutorService,
  ],
  exports: [RunsService, RunContextService, ExecutorService],
})
export class WorkflowsModule {}
