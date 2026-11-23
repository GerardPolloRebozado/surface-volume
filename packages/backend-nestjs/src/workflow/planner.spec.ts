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

const context = { iteration: 0, values: {} };

describe('planContinuations', () => {
  it('returns the successors of a node', () => {
    expect(planContinuations(window, 'trigger', context)).toEqual([
      { nodeId: 'a1', iteration: 0 },
    ]);
    expect(planContinuations(window, 'a1', context)).toEqual([
      { nodeId: 'a2', iteration: 0 },
    ]);
  });

  it('returns nothing for a terminal node', () => {
    expect(planContinuations(window, 'a2', context)).toEqual([]);
  });
});

describe('filter and branch', () => {
  const graph: PlannerWindow = {
    trigger: { id: 'trigger' },
    nodes: [
      {
        id: 'f1',
        type: 'filter',
        conditions: [[{ left: 'a1.ok', op: 'eq', right: 'true' }]],
      },
      {
        id: 'b1',
        type: 'branch',
        paths: [
          { name: 'yes', conditions: [[{ left: 'a1.count', op: 'gt', right: '2' }]] },
          { name: 'no', conditions: [[]] },
        ],
      },
    ],
    links: [
      { id: 'l1', from: 'f1', to: 'b1' },
      { id: 'l2', from: 'b1', to: 'yesNode', fromPath: 'yes' },
      { id: 'l3', from: 'b1', to: 'noNode', fromPath: 'no' },
      { id: 'l4', from: 'yesNode', to: 'end' },
      { id: 'l5', from: 'noNode', to: 'end' },
    ],
  };

  it('jumps past the guarded subgraph when a filter is false', () => {
    const result = planContinuations(graph, 'f1', {
      iteration: 0,
      values: { a1: { ok: false } },
    });
    expect(result.map((c) => c.nodeId)).toEqual(['end']);
  });

  it('takes the first matching branch path', () => {
    const result = planContinuations(graph, 'b1', {
      iteration: 0,
      values: { a1: { count: 5 } },
    });
    expect(result[0].nodeId).toBe('yesNode');
    expect(result[0].branchTaken).toBe('yes');
  });

  it('falls through to the last path', () => {
    const result = planContinuations(graph, 'b1', {
      iteration: 0,
      values: { a1: { count: 0 } },
    });
    expect(result[0].nodeId).toBe('noNode');
  });
});

describe('delay and loop', () => {
  const graph: PlannerWindow = {
    trigger: { id: 'trigger' },
    nodes: [
      { id: 'd1', type: 'delay', forMs: 60000 },
      { id: 'loop1', type: 'loop', items: 'trigger.items' },
    ],
    links: [
      { id: 'l1', from: 'd1', to: 'loop1' },
      { id: 'l2', from: 'loop1', to: 'body' },
      { id: 'l3', from: 'body', to: 'end' },
    ],
  };

  it('delays the continuation', () => {
    const result = planContinuations(graph, 'd1', context);
    expect(result[0].delayMs).toBeGreaterThanOrEqual(0);
  });

  it('repeats the body with a growing iteration', () => {
    const values = { trigger: { items: ['a', 'b', 'c'] } };
    const first = planContinuations(graph, 'loop1', { iteration: 0, values });
    expect(first).toEqual([{ nodeId: 'body', iteration: 1, loopItem: 'b' }]);

    const last = planContinuations(graph, 'loop1', { iteration: 2, values });
    expect(last.map((c) => c.nodeId)).toEqual(['end']);
  });
});

describe('findNode', () => {
  it('finds a node by id', () => {
    expect(findNode(window, 'a1')?.type).toBe('action');
    expect(findNode(window, 'missing')).toBeUndefined();
  });
});
