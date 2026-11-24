import { Module } from '@nestjs/common';
import { ConnectionCryptoService } from './connection-crypto.service';
import { ConnectionsService } from './connections.service';
import { ConnectionsController } from './connections.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [ConnectionsController],
  providers: [ConnectionCryptoService, ConnectionsService],
  exports: [ConnectionCryptoService, ConnectionsService],
})
export class ConnectionsModule {}
