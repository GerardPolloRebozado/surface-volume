import { Module } from '@nestjs/common';
import { ConnectionCryptoService } from './connection-crypto.service';

@Module({
  providers: [ConnectionCryptoService],
  exports: [ConnectionCryptoService],
})
export class ConnectionsModule {}
