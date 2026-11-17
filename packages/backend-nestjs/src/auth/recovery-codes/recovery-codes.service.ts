import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  parseRecoveryCodeTtlMinutes,
  recoveryCodeCutoff,
  ttlMs,
} from './recovery-code-expiry';

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Short-lived, single-use MFA recovery codes.
 *
 * A code is deleted as soon as it is used, or as soon as its TTL passes:
 * - verify() checks and deletes in one query, so a code can never be used twice;
 * - issue() starts a timer that deletes the row when the TTL ends;
 * - a restart loses those timers, so expired leftovers are deleted at startup,
 *   and verify() also clears the user's expired codes.
 * Whatever the timers do, an expired code is always rejected: verify() compares created_at.
 */
@Injectable()
export class RecoveryCodesService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RecoveryCodesService.name);
  private readonly ttlMinutes: number;
  private readonly timers = new Set<NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {
    // ConfigModule.forRoot() loads .env into process.env at startup.
    this.ttlMinutes = parseRecoveryCodeTtlMinutes(
      process.env.RECOVERY_CODE_TTL_MINUTES,
    );
  }

  /** Creates a code for the user and returns it in plaintext. Only its hash is stored. */
  async issue(userId: string): Promise<string> {
    const code = randomBytes(5).toString('hex'); // 10 hex chars, 40 bits
    const row = await this.prisma.mfaRecoveryCode.create({
      data: { userId, codeHash: hashRecoveryCode(code) },
    });
    this.scheduleDeletion(row.id);
    return code;
  }

  /** True if the code was valid. A valid code is consumed (deleted) by this call. */
  async verify(
    userId: string,
    code: string,
    now: Date = new Date(),
  ): Promise<boolean> {
    const cutoff = recoveryCodeCutoff(now, this.ttlMinutes);
    const [used] = await this.prisma.$transaction([
      this.prisma.mfaRecoveryCode.deleteMany({
        where: {
          userId,
          codeHash: hashRecoveryCode(code),
          createdAt: { gt: cutoff },
        },
      }),
      this.prisma.mfaRecoveryCode.deleteMany({
        where: { userId, createdAt: { lte: cutoff } },
      }),
    ]);
    return used.count > 0;
  }

  /** Deletes every expired code. Runs once at startup to catch up after a restart. */
  async deleteExpired(now: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.mfaRecoveryCode.deleteMany({
      where: { createdAt: { lte: recoveryCodeCutoff(now, this.ttlMinutes) } },
    });
    if (count > 0) {
      this.logger.log(`Deleted ${count} expired MFA recovery code(s)`);
    }
    return count;
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.deleteExpired();
  }

  onModuleDestroy(): void {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
  }

  private scheduleDeletion(id: string): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.prisma.mfaRecoveryCode
        .deleteMany({ where: { id } })
        .catch((err: Error) =>
          this.logger.warn(
            `Could not delete expired code ${id}: ${err.message}`,
          ),
        );
    }, ttlMs(this.ttlMinutes));
    timer.unref(); // never keeps the process alive on shutdown
    this.timers.add(timer);
  }
}
