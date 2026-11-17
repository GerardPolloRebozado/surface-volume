import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import {
  parseRecoveryCodeTtlDays,
  recoveryCodeCutoff,
} from './recovery-code-expiry';

/**
 * Deletes MFA recovery codes older than RECOVERY_CODE_TTL_DAYS.
 * Used codes are deleted at use time, so this only removes unused, expired ones.
 */
@Injectable()
export class RecoveryCodeCleanupService {
  private readonly logger = new Logger(RecoveryCodeCleanupService.name);
  private readonly ttlDays: number;

  constructor(private readonly prisma: PrismaService) {
    // ConfigModule.forRoot() loads .env into process.env at startup.
    this.ttlDays = parseRecoveryCodeTtlDays(process.env.RECOVERY_CODE_TTL_DAYS);
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'recovery-code-cleanup',
    timeZone: 'UTC',
  })
  async deleteExpired(now: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.mfaRecoveryCode.deleteMany({
      where: { createdAt: { lte: recoveryCodeCutoff(now, this.ttlDays) } },
    });
    if (count > 0) {
      this.logger.log(`Deleted ${count} expired MFA recovery code(s)`);
    }
    return count;
  }
}
