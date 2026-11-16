import type { InputField, OutputField } from './fields.types';
import type { RunContext } from './context.types';

export interface ActionDefinition {
  key: string;
  name: string;
  description: string;
  inputFields: InputField[];
  outputFields: OutputField[];
  sample: Record<string, unknown>;
  run: (ctx: RunContext) => Promise<Record<string, unknown>>;
}

export class ActionError extends Error {
  constructor(
    message: string,
    public kind: 'retryable' | 'fatal' | 'auth_expired' | 'rate_limited',
    public retryAfterMs?: number,
  ) {
    super(message);
  }
}
