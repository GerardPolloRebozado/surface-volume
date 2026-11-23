import { completionStatus } from './run-completion';

describe('completionStatus', () => {
  it('waits while steps remain', () => {
    expect(completionStatus('succeeded', 2)).toBeNull();
    expect(completionStatus('failed', 1)).toBeNull();
  });

  it('succeeds or fails the run when the last step is done', () => {
    expect(completionStatus('succeeded', 0)).toBe('succeeded');
    expect(completionStatus('failed', 0)).toBe('failed');
  });
});
