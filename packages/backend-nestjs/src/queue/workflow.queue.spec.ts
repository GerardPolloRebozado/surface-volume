import { pollJobId, stepJobId } from './job-ids';

describe('job ids', () => {
  it('includes the attempt so a retry is a different job', () => {
    expect(stepJobId('step-1', 1)).toBe('step:step-1:1');
    expect(stepJobId('step-1', 2)).toBe('step:step-1:2');
  });

  it('includes the due time so a trigger is not polled twice', () => {
    const due = new Date('2026-01-01T00:00:00.000Z');
    expect(pollJobId('trigger-1', due)).toBe(`poll:trigger-1:${due.getTime()}`);
  });
});
