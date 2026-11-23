import { findNode, planContinuations, type PlannerWindow } from './planner';

const window: PlannerWindow = {
  trigger: { id: 'trigger' },
  nodes: [
    {
      id: 'a1',
      type: 'action',
      appId: 'gmail',
      actionKey: 'send_email',
      inputs: {},
    },
  ],
  links: [
    { id: 'l1', from: 'trigger', to: 'a1' },
    { id: 'l2', from: 'a1', to: 'a2' },
  ],
};

describe('planContinuations', () => {
  it('returns the successors of a node', () => {
    expect(planContinuations(window, 'trigger')).toEqual([
      { nodeId: 'a1', iteration: 0 },
    ]);
    expect(planContinuations(window, 'a1')).toEqual([
      { nodeId: 'a2', iteration: 0 },
    ]);
  });

  it('returns nothing for a terminal node', () => {
    expect(planContinuations(window, 'a2')).toEqual([]);
  });
});

describe('findNode', () => {
  it('finds a node by id', () => {
    expect(findNode(window, 'a1')?.type).toBe('action');
    expect(findNode(window, 'missing')).toBeUndefined();
  });
});
