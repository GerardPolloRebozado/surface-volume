import { runWithAction } from '../src/workflow/action-runner';
import type { ActionDefinition } from '../src/workflow/actions.types';
import type { RunContext } from '../src/workflow/context.types';
import { completionStatus } from '../src/workflow/run-completion';
import { planContinuations, type PlannerWindow } from '../src/workflow/planner';

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

const action = (suffix: string): ActionDefinition => ({
  key: `send_${suffix}`,
  name: `Send ${suffix}`,
  description: '',
  inputFields: [],
  outputFields: [],
  sample: {},
  async run(ctx) {
    return { messageId: `${suffix}-${ctx.inputs.text}` };
  },
});

describe('runner flow', () => {
  it('walks two actions and completes the run', async () => {
    const window: PlannerWindow = {
      trigger: { id: 'trigger' },
      nodes: [
        {
          id: 'a1',
          type: 'action',
          appId: 'fake',
          actionKey: 'send_a1',
          inputs: { text: '{{ trigger.title }}' },
        },
        {
          id: 'a2',
          type: 'action',
          appId: 'fake',
          actionKey: 'send_a2',
          inputs: { text: '{{ a1.messageId }}' },
        },
      ],
      links: [
        { id: 'l1', from: 'trigger', to: 'a1' },
        { id: 'l2', from: 'a1', to: 'a2' },
      ],
    };

    const outputsByNode: Record<string, Record<string, unknown>> = {
      trigger: { title: 'hello' },
    };

    const firstStep = planContinuations(window, 'trigger');
    expect(firstStep).toEqual([{ nodeId: 'a1', iteration: 0 }]);

    const first = await runWithAction(action('a1'), { text: 'hello' }, context);
    expect(first.status).toBe('succeeded');
    expect(completionStatus(first.status, 1)).toBeNull();
    outputsByNode.a1 = first.outputs;

    const secondStep = planContinuations(window, 'a1');
    expect(secondStep).toEqual([{ nodeId: 'a2', iteration: 0 }]);

    const second = await runWithAction(
      action('a2'),
      { text: outputsByNode.a1.messageId },
      context,
    );
    expect(second.outputs).toEqual({ messageId: 'a2-a1-hello' });
    expect(completionStatus(second.status, 0)).toBe('succeeded');
  });
});
