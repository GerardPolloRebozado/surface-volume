import {
  DEFAULT_RECOVERY_CODE_TTL_MINUTES,
  isRecoveryCodeExpired,
  parseRecoveryCodeTtlMinutes,
  recoveryCodeCutoff,
} from './recovery-code-expiry';
import {
  hashRecoveryCode,
  RecoveryCodesService,
} from './recovery-codes.service';

const now = new Date('2026-11-17T12:00:00Z');

describe('recovery code expiry', () => {
  it('defaults to 5 minutes and rejects bad values', () => {
    expect(DEFAULT_RECOVERY_CODE_TTL_MINUTES).toBe(5);
    expect(parseRecoveryCodeTtlMinutes('10')).toBe(10);
    expect(parseRecoveryCodeTtlMinutes(undefined)).toBe(5);
    expect(parseRecoveryCodeTtlMinutes('0')).toBe(5);
    expect(parseRecoveryCodeTtlMinutes('abc')).toBe(5);
  });

  it('expires a code exactly when its TTL ends', () => {
    expect(recoveryCodeCutoff(now, 5).toISOString()).toBe(
      '2026-11-17T11:55:00.000Z',
    );
    expect(
      isRecoveryCodeExpired(new Date('2026-11-17T11:55:00Z'), now, 5),
    ).toBe(true);
    expect(
      isRecoveryCodeExpired(new Date('2026-11-17T11:55:01Z'), now, 5),
    ).toBe(false);
  });
});

describe('RecoveryCodesService', () => {
  const originalTtl = process.env.RECOVERY_CODE_TTL_MINUTES;

  function build(deletedCounts: number[] = []) {
    delete process.env.RECOVERY_CODE_TTL_MINUTES;
    const deleteMany = jest.fn();
    deletedCounts.forEach((count) =>
      deleteMany.mockResolvedValueOnce({ count }),
    );
    deleteMany.mockResolvedValue({ count: 0 });
    const prisma = {
      mfaRecoveryCode: {
        create: jest.fn().mockResolvedValue({ id: 'code-1' }),
        deleteMany,
      },
      $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    } as any;
    return { service: new RecoveryCodesService(prisma), prisma, deleteMany };
  }

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    if (originalTtl === undefined) delete process.env.RECOVERY_CODE_TTL_MINUTES;
    else process.env.RECOVERY_CODE_TTL_MINUTES = originalTtl;
  });

  it('stores only the hash of the issued code', async () => {
    const { service, prisma } = build();

    const code = await service.issue('user-1');

    expect(code).toMatch(/^[0-9a-f]{10}$/);
    expect(prisma.mfaRecoveryCode.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', codeHash: hashRecoveryCode(code) },
    });
  });

  it('deletes the row as soon as the TTL passes', async () => {
    const { service, deleteMany } = build();
    await service.issue('user-1');

    jest.advanceTimersByTime(5 * 60 * 1000 - 1);
    expect(deleteMany).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'code-1' } });
  });

  it('accepts a valid code once, consuming it in the same query', async () => {
    const { service, deleteMany } = build([1, 0]);

    await expect(service.verify('user-1', 'abc', now)).resolves.toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        codeHash: hashRecoveryCode('abc'),
        createdAt: { gt: new Date('2026-11-17T11:55:00.000Z') },
      },
    });
  });

  it('rejects an unknown, used or expired code and clears expired ones', async () => {
    const { service, deleteMany } = build([0, 2]);

    await expect(service.verify('user-1', 'abc', now)).resolves.toBe(false);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        createdAt: { lte: new Date('2026-11-17T11:55:00.000Z') },
      },
    });
  });

  it('deletes expired leftovers at startup', async () => {
    const { service, deleteMany } = build([3]);

    await service.onApplicationBootstrap();
    expect(deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lte: expect.any(Date) } },
    });
  });

  it('clears pending timers on shutdown', async () => {
    const { service, deleteMany } = build();
    await service.issue('user-1');

    service.onModuleDestroy();
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
