import type { AuthDefinition, VerifiedCredential } from './auth.types';
import type { TriggerDefinition } from './triggers.types';
import type { ActionDefinition } from './actions.types';

/** Describes one third-party service and everything it exposes. */
export interface AppDefinition {
  id: string;
  name: string;
  logoUrl?: string;
  auth: AuthDefinition;
  verify?: (credentials: Record<string, unknown>) => Promise<VerifiedCredential>;
  triggers: Record<string, TriggerDefinition>;
  actions: Record<string, ActionDefinition>;
}
