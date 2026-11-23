import { ActionError } from '../../../workflow';
import { fakeGmail, json, makeCtx, MemoryStore } from '../gmail.testing-spec';
import type { Msg } from '../gmail.testing-spec';
import {
  newStarredEmail as trigger,
  STARRED_MAX_PAGES,
} from './new-starred-email.trigger';

describe('new_starred_email', () => {
  const T0 = 1_800_000_000;
  const realFetch = global.fetch;
  let starred: Msg[];
  let gmail: ReturnType<typeof fakeGmail>;

  beforeEach(() => {
    starred = [
      { id: 'a', internalDate: T0 - 10 },
      { id: 'b', internalDate: T0 - 20 },
    ];
    gmail = fakeGmail(starred);
    global.fetch = gmail.fetchMock as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('declares no inputs and the shared email outputs', () => {
    expect(trigger.type).toBe('polling');
    expect(trigger.inputFields).toEqual([]);
    expect(trigger.outputFields.map((f) => f.key)).toEqual([
      'message_id',
      'thread_id',
      'from',
      'to',
      'subject',
      'snippet',
      'body_text',
      'received_at',
      'has_attachments',
      'labels',
    ]);
  });

  it('records the current starred set on the first poll and fires nothing', async () => {
    const store = new MemoryStore();
    await expect(trigger.poll(makeCtx(store))).resolves.toEqual([]);
    expect(store.data.get('starred')).toEqual(['a', 'b']);
    expect(gmail.queries).toEqual(['is:starred']);
    expect(gmail.getCalls).toEqual([]);
  });

  it('fires for newly starred emails, oldest first, once', async () => {
    const store = new MemoryStore();
    const ctx = makeCtx(store);
    await trigger.poll(ctx);

    // Starring a recent email and an old one: the old one sorts deep in the list.
    starred.unshift({ id: 'new', internalDate: T0 });
    starred.push({ id: 'old', internalDate: T0 - 100_000 });

    const events = await trigger.poll(ctx);
    expect(events.map((e) => e.id)).toEqual(['old', 'new']);
    expect(events[1].data).toMatchObject({
      message_id: 'new',
      thread_id: 't-new',
      subject: 'subj new',
    });
    expect(gmail.getCalls).toEqual(['new', 'old']);

    gmail.getCalls.length = 0;
    await expect(trigger.poll(ctx)).resolves.toEqual([]);
    expect(gmail.getCalls).toEqual([]);
  });

  it('fires again when an email is unstarred then starred again', async () => {
    const store = new MemoryStore();
    const ctx = makeCtx(store);
    await trigger.poll(ctx);

    const [a] = starred.splice(0, 1);
    await expect(trigger.poll(ctx)).resolves.toEqual([]);
    expect(store.data.get('starred')).toEqual(['b']);

    starred.unshift(a);
    const events = await trigger.poll(ctx);
    expect(events.map((e) => e.id)).toEqual(['a']);
  });

  it('keeps known IDs when the listing is cut off at the page cap', async () => {
    const many = Array.from({ length: STARRED_MAX_PAGES * 2 + 1 }, (_, i) => ({
      id: `m${i}`,
      internalDate: T0 - i,
    }));
    const paged = fakeGmail(many, { pageSize: 2 });
    global.fetch = paged.fetchMock as typeof fetch;
    const store = new MemoryStore();
    // 'beyond' is starred but past the cap, so it isn't in this listing.
    store.data.set('starred', ['m0', 'beyond']);

    const events = await trigger.poll(makeCtx(store));
    expect(paged.queries).toHaveLength(STARRED_MAX_PAGES);
    expect(events).toHaveLength(STARRED_MAX_PAGES * 2 - 1);
    expect(store.data.get('starred')).toContain('beyond');
  });

  it.each([
    [401, 'auth_expired'],
    [429, 'rate_limited'],
    [500, 'retryable'],
  ])(
    'maps HTTP %i to %s and leaves the store unchanged',
    async (status, kind) => {
      const store = new MemoryStore();
      store.data.set('starred', ['a']);
      global.fetch = jest.fn(async () =>
        json({ error: 'x' }, status),
      ) as typeof fetch;

      const err = await trigger.poll(makeCtx(store)).catch((e) => e);
      expect(err).toBeInstanceOf(ActionError);
      expect(err.kind).toBe(kind);
      expect(store.data.get('starred')).toEqual(['a']);
    },
  );

  it('leaves the store unchanged when fetching a new message fails', async () => {
    const store = new MemoryStore();
    store.data.set('starred', ['b']);
    global.fetch = jest.fn(async (input: string | URL) =>
      String(input).includes('/messages/')
        ? json({ error: 'x' }, 503)
        : gmail.fetchMock(input),
    ) as typeof fetch;

    const err = await trigger.poll(makeCtx(store)).catch((e) => e);
    expect(err.kind).toBe('retryable');
    expect(store.data.get('starred')).toEqual(['b']);
  });

  it('test() returns up to 3 starred emails without touching the store', async () => {
    starred.push(
      { id: 'c', internalDate: T0 - 30 },
      { id: 'd', internalDate: T0 - 40 },
    );
    const store = new MemoryStore();
    const events = await trigger.test!(makeCtx(store));
    expect(events.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(store.data.size).toBe(0);
  });
});
