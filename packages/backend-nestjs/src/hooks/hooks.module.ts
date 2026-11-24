import { Module } from '@nestjs/common';
import { ConnectionsModule } from '../connections/connections.module';
import { TriggersModule } from '../triggers/triggers.module';
import { UsersModule } from '../users/users.module';
import { WorkflowsModule } from '../workflow/workflows.module';
import { HooksController } from './hooks.controller';
import { HooksService } from './hooks.service';

@Module({
  imports: [
    ConnectionsModule,
    TriggersModule,
    UsersModule,
    WorkflowsModule,
  ],
  controllers: [HooksController],
  providers: [HooksService],
})
export class HooksModule {}
