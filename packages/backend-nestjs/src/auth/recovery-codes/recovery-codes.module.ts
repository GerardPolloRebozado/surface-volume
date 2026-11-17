import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecoveryCodeCleanupService } from './recovery-code-cleanup.service';

@Module({
  providers: [RecoveryCodeCleanupService, PrismaService],
  exports: [RecoveryCodeCleanupService],
})
export class RecoveryCodesModule {}
