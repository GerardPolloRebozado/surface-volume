import type { InputField, OutputField } from './fields.types';
import type { RunContext } from './context.types';
import type { ActionPlan } from './action-plan';

export interface PollingPlan extends ActionPlan {}

export interface TriggerEvent {
  id: string;
  data: Record<string, unknown>;
  occurredAt?: string;
}

export interface TriggerBase {
  key: string;
  name: string;
  description: string;
  inputFields: InputField[];
  outputFields: OutputField[];
  sample: Record<string, unknown>;
  test?: (ctx: RunContext) => Promise<TriggerEvent[]>;
}

export interface IncomingWebhook {
  workflowId: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  rawBody: Buffer;
  body: unknown;
  receivedAt: string;
}

export interface WebhookTrigger extends TriggerBase {
  type: 'webhook';
  subscribe?: (
    ctx: RunContext,
    webhookUrl: string,
  ) => Promise<{ subscriptionId: string }>;
  unsubscribe?: (ctx: RunContext, subscriptionId: string) => Promise<void>;
  verify?: (
    req: IncomingWebhook,
    secrets: { signingSecret?: string },
  ) => boolean | Promise<boolean>;
  parse: (req: IncomingWebhook, ctx: RunContext) => Promise<TriggerEvent[]>;
  handshake?: (
    req: IncomingWebhook,
  ) => { status: number; body: unknown } | null;
}

export interface PollingTrigger extends TriggerBase {
  type: 'polling';
  defaultIntervalSec: number;
  poll?: (ctx: RunContext) => Promise<TriggerEvent[]>;
  plan?: (ctx: RunContext) => Promise<PollingPlan> | PollingPlan;
  map?: (
    outputs: Record<string, unknown>,
    ctx: RunContext,
  ) => Promise<TriggerEvent[]> | TriggerEvent[];
}

export interface ScheduleTrigger extends TriggerBase {
  type: 'schedule';
}

export type TriggerDefinition =
  | WebhookTrigger
  | PollingTrigger
  | ScheduleTrigger;
