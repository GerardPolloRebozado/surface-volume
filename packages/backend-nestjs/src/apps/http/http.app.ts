import type { ActionDefinition, AppDefinition } from '../../workflow';
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

export const httpApp: AppDefinition = {
  id: 'http',
  name: 'HTTP',
  auth: { type: 'none' },
  triggers: {},
  actions: { [httpRequest.key]: httpRequest },
};
