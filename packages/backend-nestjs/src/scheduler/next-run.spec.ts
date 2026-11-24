import { nextRunAt } from './next-run';

describe('nextRunAt', () => {
  it('uses the interval when there is no cron expression', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    expect(nextRunAt({ cron: null, intervalSec: 180 }, from)).toEqual(
      new Date('2026-01-01T00:03:00.000Z'),
    );
  });

  it('falls back to one minute', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    expect(nextRunAt({ cron: null, intervalSec: null }, from)).toEqual(
      new Date('2026-01-01T00:01:00.000Z'),
    );
  });

  it('uses the cron expression when present', () => {
    const from = new Date('2026-01-01T00:00:30.000Z');
    expect(nextRunAt({ cron: '0 * * * *', intervalSec: 600 }, from)).toEqual(
      new Date('2026-01-01T01:00:00.000Z'),
    );
  });
});
