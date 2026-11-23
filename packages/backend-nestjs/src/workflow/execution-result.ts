import { ActionError } from './actions.types';
import type { Prisma } from '../generated/prisma/client';

type ErrorKind = 'retryable' | 'fatal' | 'auth_expired' | 'rate_limited';

export interface ActionResult {
  status: 'succeeded' | 'failed';
  outputs: Record<string, unknown>;
  errorKind?: ErrorKind;
  errorMessage?: string;
  retryAfterMs?: number;
}

export function actionErrorResult(error: unknown): ActionResult {
  if (error instanceof ActionError) {
    return {
      status: 'failed',
      outputs: {},
      errorKind: error.kind,
      errorMessage: error.message,
      retryAfterMs: error.retryAfterMs,
    };
  }

  return {
    status: 'failed',
    outputs: {},
    errorKind: 'fatal',
    errorMessage: error instanceof Error ? error.message : String(error),
  };
}

export function jsonOutputs(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function jsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
