import type {
  ActionDefinition,
  AppDefinition,
  PollingPlan,
  PollingTrigger,
  TriggerEvent,
} from '../../workflow';
import { planFromInputs } from '../../workflow/action-plan';

export const httpRequest: ActionDefinition = {
  key: 'request',
  name: 'HTTP request',
  description: 'Runs a list of HTTP calls on the worker.',
  inputFields: [],
  outputFields: [],
  sample: {},
  async run() {
    throw new Error('The HTTP action is executed by the worker');
  },
  async plan(ctx) {
    return planFromInputs(ctx.inputs);
  },
};

export const httpPoll: PollingTrigger = {
  key: 'poll',
  name: 'HTTP poll',
  description: 'Calls an endpoint on the worker and turns the response into events.',
  type: 'polling',
  defaultIntervalSec: 60,
  inputFields: [],
  outputFields: [],
  sample: {},

  plan(ctx): PollingPlan {
    return planFromInputs(ctx.inputs);
  },

  map(outputs): TriggerEvent[] {
    const rows = Array.isArray(outputs.events)
      ? (outputs.events as Record<string, unknown>[])
      : [];
    return rows.map((row) => ({
      id: String(row.id ?? ''),
      data: (row.data ?? row) as Record<string, unknown>,
    }));
  },
};

export const httpApp: AppDefinition = {
  id: 'http',
  name: 'HTTP',
  auth: { type: 'none' },
  triggers: { [httpPoll.key]: httpPoll },
  actions: { [httpRequest.key]: httpRequest },
};
