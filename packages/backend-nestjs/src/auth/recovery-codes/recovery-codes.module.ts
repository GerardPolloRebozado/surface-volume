import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecoveryCodesService } from './recovery-codes.service';

@Module({
  providers: [RecoveryCodesService, PrismaService],
  exports: [RecoveryCodesService],
})
export class RecoveryCodesModule {}
