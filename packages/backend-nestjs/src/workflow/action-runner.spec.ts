import { ActionError } from './actions.types';
import { runWithAction } from './action-runner';
import type { ActionDefinition } from './actions.types';
import type { RunContext } from './context.types';

const context: RunContext = {
  inputs: {},
  store: {
    async get<T>() {
      return undefined as T | undefined;
    },
    async set() {},
    async delete() {},
  },
};

const base = {
  key: 'send',
  name: 'Send',
  description: '',
  inputFields: [],
  outputFields: [],
  sample: {},
};

describe('runWithAction', () => {
  it('returns the action outputs on success', async () => {
    const action: ActionDefinition = {
      ...base,
      async run(ctx) {
        return { messageId: ctx.inputs.text };
      },
    };

    expect(await runWithAction(action, { text: 'hello' }, context)).toEqual({
      status: 'succeeded',
      outputs: { messageId: 'hello' },
    });
  });

  it('maps ActionError to an error kind', async () => {
    const action: ActionDefinition = {
      ...base,
      async run() {
        throw new ActionError('expired token', 'auth_expired');
      },
    };

    expect(await runWithAction(action, {}, context)).toEqual({
      status: 'failed',
      outputs: {},
      errorKind: 'auth_expired',
      errorMessage: 'expired token',
      retryAfterMs: undefined,
    });
  });

  it('treats unexpected errors as fatal', async () => {
    const action: ActionDefinition = {
      ...base,
      async run() {
        throw new Error('boom');
      },
    };

    expect((await runWithAction(action, {}, context)).errorKind).toBe('fatal');
  });
});
