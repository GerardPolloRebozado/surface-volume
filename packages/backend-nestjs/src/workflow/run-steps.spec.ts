import { triggerStepData } from './run-steps';

describe('triggerStepData', () => {
  it('records the event as a completed trigger step', () => {
    const step = triggerStepData({
      id: 'event-1',
      data: { videoId: 'abc' },
    });

    expect(step.nodeId).toBe('trigger');
    expect(step.status).toBe('succeeded');
    expect(step.outputs).toEqual({ videoId: 'abc' });
    expect(step.finishedAt).toBeInstanceOf(Date);
  });
});
