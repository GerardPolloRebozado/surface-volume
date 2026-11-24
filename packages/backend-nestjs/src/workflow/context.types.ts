import type { AppCredential } from './credential.types';

/** Small key/value store exposed to connectors for stateful logic. */
export interface KeyValueStore {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

/** Everything a trigger/action gets when it runs. */
export interface RunContext<TInputs = Record<string, any>> {
  inputs: TInputs;
  runId?: string;
  nodeId?: string;
  credential?: AppCredential;
  store: KeyValueStore;
}

/** The reduced context available while validating credentials. */
export type AuthContext = Pick<RunContext, 'credential'>;
