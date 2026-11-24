import { createHash } from 'node:crypto';
import type { TriggerEvent } from '../workflow/triggers.types';

export function externalIdForEvent(event: TriggerEvent): string {
  if (event.id) return event.id;

  return createHash('sha256')
    .update(JSON.stringify(event.data))
    .digest('hex');
}
