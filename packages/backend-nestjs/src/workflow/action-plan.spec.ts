import { planFromInputs } from './action-plan';

describe('planFromInputs', () => {
  it('builds a list of calls with generated ids', () => {
    const plan = planFromInputs({
      calls: [
        { method: 'get', url: 'https://example.com/items', outputs: { ids: '$.items[*].id' } },
        { id: 'second', method: 'post', url: 'https://example.com/send', body: { id: 1 } },
      ],
    });

    expect(plan.calls[0].id).toBe('call_1');
    expect(plan.calls[0].method).toBe('GET');
    expect(plan.calls[0].outputs).toEqual({ ids: '$.items[*].id' });
    expect(plan.calls[1].id).toBe('second');
  });

  it('rejects missing calls', () => {
    expect(() => planFromInputs({})).toThrow();
  });
});
