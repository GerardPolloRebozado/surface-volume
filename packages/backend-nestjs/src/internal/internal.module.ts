import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { TriggersModule } from '../triggers/triggers.module';
import { UsersModule } from '../users/users.module';
import { WorkflowsModule } from '../workflow/workflows.module';
import { ConnectionsModule } from '../connections/connections.module';
import { InternalController } from './internal.controller';
import { InternalGuard } from './internal.guard';
import { StepRunnerService } from './step-runner.service';

@Module({
  imports: [WorkflowsModule, UsersModule, QueueModule, TriggersModule, ConnectionsModule],
  controllers: [InternalController],
  providers: [InternalGuard, StepRunnerService],
  exports: [InternalGuard],
})
export class InternalModule {}
