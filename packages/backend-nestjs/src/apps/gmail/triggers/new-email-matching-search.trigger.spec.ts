import { ActionError } from '../../../workflow';
import type { KeyValueStore, RunContext } from '../../../workflow';
import {
  newEmailMatchingSearch as trigger,
  OVERLAP_SEC,
} from './new-email-matching-search.trigger';

class MemoryStore implements KeyValueStore {
  data = new Map<string, unknown>();
  get<T>(key: string) {
    return Promise.resolve(this.data.get(key) as T | undefined);
  }
  set(key: string, value: unknown) {
    this.data.set(key, structuredClone(value));
    return Promise.resolve();
  }
  delete(key: string) {
    this.data.delete(key);
    return Promise.resolve();
  }
}

type Msg = { id: string; internalDate: number };

/** Fake Gmail API: `inbox` is newest-first; list ignores the query except for recording it. */
function fakeGmail(inbox: Msg[], opts: { pageSize?: number } = {}) {
  const queries: string[] = [];
  const getCalls: string[] = [];
  const fetchMock = jest.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    const getMatch = url.pathname.match(/\/messages\/([^/]+)$/);
    if (getMatch) {
      const id = decodeURIComponent(getMatch[1]);
      getCalls.push(id);
      const m = inbox.find((x) => x.id === id)!;
      return json({
        id: m.id,
        threadId: `t-${m.id}`,
        internalDate: String(m.internalDate * 1000),
        payload: { headers: [{ name: 'Subject', value: `subj ${m.id}` }] },
      });
    }
    queries.push(url.searchParams.get('q')!);
    const size = opts.pageSize ?? Number(url.searchParams.get('maxResults'));
    const start = Number(url.searchParams.get('pageToken') ?? 0);
    const page = inbox.slice(start, start + size);
    return json({
      messages: page.map((m) => ({ id: m.id, threadId: `t-${m.id}` })),
      nextPageToken:
        start + size < inbox.length ? String(start + size) : undefined,
    });
  });
  return { fetchMock, queries, getCalls };
}

function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function makeCtx(
  store = new MemoryStore(),
  query = 'from:boss@company.com',
): RunContext {
  return {
    inputs: { query },
    store,
    credential: {
      id: 'c1',
      userId: 'u1',
      appId: 'gmail',
      displayName: 'me@example.com',
      credentials: { accessToken: 'tok' },
      status: 'active',
    },
  };
}

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
