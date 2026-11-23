import type { Connection } from '../generated/prisma/client';
import type { AppCredential } from './credential.types';

export function toAppCredential(
  connection: Connection,
  credentials: Record<string, unknown>,
): AppCredential {
  return {
    id: connection.id,
    userId: connection.userId,
    appId: connection.appId,
    displayName: connection.displayName,
    status: connection.status,
    credentials,
  };
}
