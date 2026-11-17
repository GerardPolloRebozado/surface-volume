/** Default lifetime of an MFA recovery code when RECOVERY_CODE_TTL_MINUTES is not set. */
export const DEFAULT_RECOVERY_CODE_TTL_MINUTES = 5;

const MINUTE_MS = 60 * 1000;

/** Reads RECOVERY_CODE_TTL_MINUTES, falling back to the default on a missing or invalid value. */
export function parseRecoveryCodeTtlMinutes(raw: string | undefined): number {
  const minutes = Number(raw);
  return Number.isInteger(minutes) && minutes > 0
    ? minutes
    : DEFAULT_RECOVERY_CODE_TTL_MINUTES;
}

export function ttlMs(ttlMinutes: number): number {
  return ttlMinutes * MINUTE_MS;
}

/** Codes created at or before this instant are expired. */
export function recoveryCodeCutoff(now: Date, ttlMinutes: number): Date {
  return new Date(now.getTime() - ttlMs(ttlMinutes));
}

export function isRecoveryCodeExpired(
  createdAt: Date,
  now: Date,
  ttlMinutes: number,
): boolean {
  return createdAt <= recoveryCodeCutoff(now, ttlMinutes);
}
