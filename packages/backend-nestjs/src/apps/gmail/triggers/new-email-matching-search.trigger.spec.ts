import { ActionError } from '../../../workflow';
import { fakeGmail, json, makeCtx, MemoryStore } from '../gmail.testing-spec';
import type { Msg } from '../gmail.testing-spec';
import {
  newEmailMatchingSearch as trigger,
  OVERLAP_SEC,
} from './new-email-matching-search.trigger';

describe('new_email_matching_search', () => {
  const T0 = 1_800_000_000;
  let now = T0;
  const realFetch = global.fetch;

  beforeEach(() => {
    now = T0;
    jest.spyOn(Date, 'now').mockImplementation(() => now * 1000);
  });
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('records a baseline on the first poll and fires nothing', async () => {
    const gmail = fakeGmail([{ id: 'old', internalDate: T0 - 1000 }]);
    global.fetch = gmail.fetchMock as typeof fetch;
    const store = new MemoryStore();

    await expect(trigger.poll(makeCtx(store))).resolves.toEqual([]);
    expect(store.data.get('last_check')).toBe(T0);
    expect(store.data.get('seen')).toEqual({ old: T0 });
    expect(gmail.queries).toEqual(['from:boss@company.com']);
    expect(gmail.getCalls).toEqual([]);
  });

  it('returns only unseen messages, oldest first, and never duplicates', async () => {
    const inbox: Msg[] = [{ id: 'old', internalDate: T0 - 10 }];
    const gmail = fakeGmail(inbox);
    global.fetch = gmail.fetchMock as typeof fetch;
    const store = new MemoryStore();
    const ctx = makeCtx(store, 'from:a OR from:b');

    await trigger.poll(ctx);

    now = T0 + 60;
    inbox.unshift(
      { id: 'n2', internalDate: T0 + 50 },
      { id: 'n1', internalDate: T0 + 20 },
    );
    const events = await trigger.poll(ctx);
    expect(events.map((e) => e.id)).toEqual(['n1', 'n2']);
    expect(events[0].data).toMatchObject({
      message_id: 'n1',
      thread_id: 't-n1',
      subject: 'subj n1',
      received_at: new Date((T0 + 20) * 1000).toISOString(),
    });
    expect(gmail.queries[1]).toBe(
      `(from:a OR from:b) after:${T0 - OVERLAP_SEC}`,
    );

    // Overlapping window returns the same IDs again: no new events, no refetch.
    now = T0 + 120;
    gmail.getCalls.length = 0;
    await expect(trigger.poll(ctx)).resolves.toEqual([]);
    expect(gmail.getCalls).toEqual([]);
    expect(store.data.get('last_check')).toBe(T0 + 120);
  });

  it('prunes seen IDs that fall outside the overlap window', async () => {
    const store = new MemoryStore();
    store.data.set('last_check', T0);
    store.data.set('seen', { ancient: T0 - 10_000, recent: T0 - 10 });
    const gmail = fakeGmail([]);
    global.fetch = gmail.fetchMock as typeof fetch;

    now = T0 + 60;
    await trigger.poll(makeCtx(store));
    expect(store.data.get('seen')).toEqual({ recent: T0 - 10 });
  });

  it('stops paginating at the page cap', async () => {
    const inbox = Array.from({ length: 20 }, (_, i) => ({
      id: `m${i}`,
      internalDate: T0 + 20 - i,
    }));
    const gmail = fakeGmail(inbox, { pageSize: 2 });
    global.fetch = gmail.fetchMock as typeof fetch;
    const store = new MemoryStore();
    store.data.set('last_check', T0);

    now = T0 + 60;
    const events = await trigger.poll(makeCtx(store));
    expect(gmail.queries).toHaveLength(5);
    expect(events).toHaveLength(10);
  });

  it.each([
    [401, 'auth_expired'],
    [429, 'rate_limited'],
    [500, 'retryable'],
    [400, 'fatal'],
  ])(
    'maps HTTP %i to %s and leaves the store unchanged',
    async (status, kind) => {
      const store = new MemoryStore();
      store.data.set('last_check', T0);
      store.data.set('seen', { a: T0 });
      global.fetch = jest.fn(async () =>
        json({ error: 'x' }, status, { 'retry-after': '7' }),
      ) as typeof fetch;

      now = T0 + 60;
      const err = await trigger.poll(makeCtx(store)).catch((e) => e);
      expect(err).toBeInstanceOf(ActionError);
      expect(err.kind).toBe(kind);
      if (kind === 'rate_limited') expect(err.retryAfterMs).toBe(7000);
      expect(store.data.get('last_check')).toBe(T0);
      expect(store.data.get('seen')).toEqual({ a: T0 });
    },
  );

  it('maps network errors to retryable', async () => {
    const store = new MemoryStore();
    store.data.set('last_check', T0);
    global.fetch = jest.fn(async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    const err = await trigger.poll(makeCtx(store)).catch((e) => e);
    expect(err.kind).toBe('retryable');
  });

  it('fails as auth_expired without a credential', async () => {
    const ctx = { ...makeCtx(), credential: undefined };
    const err = await trigger.poll(ctx).catch((e) => e);
    expect(err).toBeInstanceOf(ActionError);
    expect(err.kind).toBe('auth_expired');
  });

  it('test() returns up to 3 latest messages without touching the store', async () => {
    const inbox = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`,
      internalDate: T0 - i,
    }));
    global.fetch = fakeGmail(inbox).fetchMock as typeof fetch;
    const store = new MemoryStore();
    const events = await trigger.test!(makeCtx(store));
    expect(events.map((e) => e.id)).toEqual(['m0', 'm1', 'm2']);
    expect(store.data.size).toBe(0);
  });
});
