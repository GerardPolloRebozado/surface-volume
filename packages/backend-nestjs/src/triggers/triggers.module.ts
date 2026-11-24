import { Module } from '@nestjs/common';
import { ConnectionsModule } from '../connections/connections.module';
import { QueueModule } from '../queue/queue.module';
import { UsersModule } from '../users/users.module';
import { WorkflowsModule } from '../workflow/workflows.module';
import { TriggersService } from './triggers.service';

@Module({
  imports: [WorkflowsModule, UsersModule, QueueModule, ConnectionsModule],
  providers: [TriggersService],
  exports: [TriggersService],
})
export class TriggersModule {}
