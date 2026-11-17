/** Default lifetime of an MFA recovery code when RECOVERY_CODE_TTL_DAYS is not set. */
export const DEFAULT_RECOVERY_CODE_TTL_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Reads RECOVERY_CODE_TTL_DAYS, falling back to the default on a missing or invalid value. */
export function parseRecoveryCodeTtlDays(raw: string | undefined): number {
  const days = Number(raw);
  return Number.isInteger(days) && days > 0
    ? days
    : DEFAULT_RECOVERY_CODE_TTL_DAYS;
}

/** Codes created before this instant are expired. */
export function recoveryCodeCutoff(now: Date, ttlDays: number): Date {
  return new Date(now.getTime() - ttlDays * DAY_MS);
}

/**
 * Expiry check for the login path. The cleanup job deletes expired rows only once a
 * day, so a row can still exist after it expired: always check before accepting a code.
 */
export function isRecoveryCodeExpired(
  createdAt: Date,
  now: Date,
  ttlDays: number,
): boolean {
  return createdAt <= recoveryCodeCutoff(now, ttlDays);
}
