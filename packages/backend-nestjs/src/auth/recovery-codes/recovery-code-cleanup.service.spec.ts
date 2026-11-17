import { RecoveryCodeCleanupService } from './recovery-code-cleanup.service';
import {
  DEFAULT_RECOVERY_CODE_TTL_DAYS,
  isRecoveryCodeExpired,
  parseRecoveryCodeTtlDays,
  recoveryCodeCutoff,
} from './recovery-code-expiry';

const now = new Date('2026-11-17T03:00:00Z');

describe('recovery code expiry', () => {
  it('parses the TTL and falls back to the default on bad input', () => {
    expect(parseRecoveryCodeTtlDays('30')).toBe(30);
    expect(parseRecoveryCodeTtlDays(undefined)).toBe(
      DEFAULT_RECOVERY_CODE_TTL_DAYS,
    );
    expect(parseRecoveryCodeTtlDays('0')).toBe(DEFAULT_RECOVERY_CODE_TTL_DAYS);
    expect(parseRecoveryCodeTtlDays('abc')).toBe(
      DEFAULT_RECOVERY_CODE_TTL_DAYS,
    );
  });

  it('computes the cutoff ttlDays before now', () => {
    expect(recoveryCodeCutoff(now, 30).toISOString()).toBe(
      '2026-10-18T03:00:00.000Z',
    );
  });

  it('treats a code exactly at the cutoff as expired', () => {
    expect(
      isRecoveryCodeExpired(new Date('2026-10-18T03:00:00Z'), now, 30),
    ).toBe(true);
    expect(
      isRecoveryCodeExpired(new Date('2026-10-18T03:00:01Z'), now, 30),
    ).toBe(false);
  });
});

describe('RecoveryCodeCleanupService', () => {
  const originalTtl = process.env.RECOVERY_CODE_TTL_DAYS;
  afterEach(() => {
    if (originalTtl === undefined) delete process.env.RECOVERY_CODE_TTL_DAYS;
    else process.env.RECOVERY_CODE_TTL_DAYS = originalTtl;
  });

  function build(ttl: string | undefined, deleted: number) {
    if (ttl === undefined) delete process.env.RECOVERY_CODE_TTL_DAYS;
    else process.env.RECOVERY_CODE_TTL_DAYS = ttl;
    const deleteMany = jest.fn().mockResolvedValue({ count: deleted });
    const prisma = { mfaRecoveryCode: { deleteMany } } as any;
    return {
      service: new RecoveryCodeCleanupService(prisma),
      deleteMany,
    };
  }

  it('deletes codes created at or before the cutoff and returns the count', async () => {
    const { service, deleteMany } = build('30', 4);

    await expect(service.deleteExpired(now)).resolves.toBe(4);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lte: new Date('2026-10-18T03:00:00.000Z') } },
    });
  });

  it('uses the default TTL when none is configured', async () => {
    const { service, deleteMany } = build(undefined, 0);

    await service.deleteExpired(now);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lte: recoveryCodeCutoff(now, DEFAULT_RECOVERY_CODE_TTL_DAYS),
        },
      },
    });
  });
});
