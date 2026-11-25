import { ActionError } from '../../../workflow';
import type { DriveChange, DriveFile } from '../drive.client';
import { json, makeCtx, MemoryStore } from '../drive.testing-spec';
import {
  CHANGES_MAX_PAGES,
  fileUpdated as trigger,
  OVERLAP_MS,
} from './file-updated.trigger';

const T0 = Date.UTC(2026, 10, 25, 10, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();

function doc(id: string, modified: number, extra: Partial<DriveFile> = {}) {
  return {
    id,
    name: `${id}.gdoc`,
    mimeType: 'application/vnd.google-apps.document',
    webViewLink: `https://docs.google.com/document/d/${id}/edit`,
    modifiedTime: iso(modified),
    parents: ['folder1'],
    lastModifyingUser: { displayName: 'Bob', emailAddress: 'bob@example.com' },
    ...extra,
  } satisfies DriveFile;
}

/**
 * Fake Drive changes feed. `pending` holds changes not yet listed; each
 * changes.list drains up to `pageSize` and hands out a new token.
 */
function fakeChanges(opts: { pageSize?: number } = {}) {
  let pending: DriveChange[] = [];
  let tokenSeq = 100;
  const calls: string[] = [];
  const fetchMock = jest.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    const path = url.pathname.replace('/drive/v3', '');
    calls.push(path);
    if (path === '/changes/startPageToken') {
      return json({ startPageToken: String(tokenSeq) });
    }
    if (path === '/files/root') return json({ id: 'ROOT' });
    if (path === '/changes') {
      const size = opts.pageSize ?? Number(url.searchParams.get('pageSize'));
      const page = pending.slice(0, size);
      pending = pending.slice(size);
      tokenSeq++;
      return json(
        pending.length
          ? { changes: page, nextPageToken: String(tokenSeq) }
          : { changes: page, newStartPageToken: String(tokenSeq) },
      );
    }
    if (path.startsWith('/files/')) {
      const id = decodeURIComponent(path.slice('/files/'.length));
      return json(doc(id, T0));
    }
    // files.list (test())
    return json({ files: [doc('x', T0), doc('y', T0 - 1)] });
  });
  return {
    fetchMock,
    calls,
    push: (...files: DriveFile[]) =>
      pending.push(...files.map((file) => ({ fileId: file.id, file }))),
    pushRaw: (...c: DriveChange[]) => pending.push(...c),
  };
}

describe('file_updated', () => {
  const realFetch = global.fetch;
  let now: number;
  let drive: ReturnType<typeof fakeChanges>;

  beforeEach(() => {
    now = T0;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    drive = fakeChanges();
    global.fetch = drive.fetchMock as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  /** Runs the baseline poll and moves the clock forward one interval. */
  async function started(
    inputs: Record<string, unknown> = { folder_id: 'folder1' },
  ) {
    const store = new MemoryStore();
    const ctx = makeCtx(store, inputs);
    await trigger.poll(ctx);
    now = T0 + 120_000;
    return { store, ctx };
  }

  it('declares the spec inputs and outputs', () => {
    expect(trigger.defaultIntervalSec).toBe(120);
    expect(trigger.inputFields.map((f) => [f.key, f.required])).toEqual([
      ['folder_id', true],
      ['file_id', false],
    ]);
    expect(trigger.inputFields[0].altersDynamicFields).toBe(true);
    expect(trigger.outputFields.map((f) => f.key)).toEqual([
      'file_id',
      'name',
      'web_view_link',
      'modified_time',
      'last_modifying_user',
    ]);
  });

  it('saves a start page token on the first poll and fires nothing', async () => {
    const store = new MemoryStore();
    await expect(trigger.poll(makeCtx(store))).resolves.toEqual([]);
    expect(store.data.get('page_token')).toBe('100');
    expect(store.data.get('last_poll')).toBe(T0);
    expect(drive.calls).toEqual(['/changes/startPageToken']);
  });

  it('fires for edits to files in the folder, oldest first, and advances the token', async () => {
    const { store, ctx } = await started();
    drive.push(doc('b', T0 + 60_000), doc('a', T0 + 30_000));

    const events = await trigger.poll(ctx);
    expect(events.map((e) => e.data.file_id)).toEqual(['a', 'b']);
    expect(events[0]).toEqual({
      id: `a:${iso(T0 + 30_000)}`,
      occurredAt: iso(T0 + 30_000),
      data: {
        file_id: 'a',
        name: 'a.gdoc',
        web_view_link: 'https://docs.google.com/document/d/a/edit',
        modified_time: iso(T0 + 30_000),
        last_modifying_user: 'bob@example.com',
      },
    });
    expect(store.data.get('page_token')).toBe('101');
    expect(store.data.get('last_poll')).toBe(T0 + 120_000);
  });

  it('ignores other folders, subfolders, trashed and removed files', async () => {
    const { ctx } = await started();
    drive.push(
      doc('elsewhere', T0 + 1000, { parents: ['other'] }),
      doc('sub', T0 + 1000, {
        mimeType: 'application/vnd.google-apps.folder',
      }),
      doc('bin', T0 + 1000, { trashed: true }),
    );
    drive.pushRaw({ fileId: 'gone', removed: true });
    await expect(trigger.poll(ctx)).resolves.toEqual([]);
  });

  it('ignores metadata-only changes to files edited long ago', async () => {
    const { ctx } = await started();
    // e.g. starred or renamed: shows up in changes, modifiedTime is old.
    drive.push(doc('old', T0 - OVERLAP_MS - 1));
    await expect(trigger.poll(ctx)).resolves.toEqual([]);
  });

  it('fires once per edit, and again for a later edit of the same file', async () => {
    const { ctx } = await started();
    drive.push(doc('a', T0 + 1000));
    await expect(trigger.poll(ctx)).resolves.toHaveLength(1);

    // Same revision reported again (e.g. starred right after): no duplicate.
    now += 120_000;
    drive.push(doc('a', T0 + 1000));
    await expect(trigger.poll(ctx)).resolves.toEqual([]);

    now += 120_000;
    drive.push(doc('a', now - 10_000));
    const events = await trigger.poll(ctx);
    expect(events.map((e) => e.id)).toEqual([`a:${iso(now - 10_000)}`]);
  });

  it('watches only the chosen file when file_id is set', async () => {
    const { ctx } = await started({ folder_id: 'folder1', file_id: 'a' });
    drive.push(
      doc('a', T0 + 1000, { parents: ['moved-away'] }),
      doc('b', T0 + 1000),
    );
    const events = await trigger.poll(ctx);
    expect(events.map((e) => e.data.file_id)).toEqual(['a']);
  });

  it('resolves the My Drive root alias once and caches it', async () => {
    const { store, ctx } = await started({ folder_id: 'root' });
    drive.push(doc('r', T0 + 1000, { parents: ['ROOT'] }));
    await expect(trigger.poll(ctx)).resolves.toHaveLength(1);
    expect(store.data.get('root_id')).toBe('ROOT');

    drive.calls.length = 0;
    await trigger.poll(ctx);
    expect(drive.calls).toEqual(['/changes']);
  });

  it('resumes from the saved token when the page cap is hit', async () => {
    drive = fakeChanges({ pageSize: 1 });
    global.fetch = drive.fetchMock as typeof fetch;
    const { store, ctx } = await started();
    for (let i = 0; i <= CHANGES_MAX_PAGES; i++)
      drive.push(doc(`f${i}`, T0 + i));

    await expect(trigger.poll(ctx)).resolves.toHaveLength(CHANGES_MAX_PAGES);
    expect(store.data.get('last_poll')).toBe(T0); // not advanced

    now += 600_000; // the leftover edit is older than now - overlap
    const rest = await trigger.poll(ctx);
    expect(rest.map((e) => e.data.file_id)).toEqual([`f${CHANGES_MAX_PAGES}`]);
  });

  it.each([
    [401, 'auth_expired'],
    [429, 'rate_limited'],
    [500, 'retryable'],
  ])(
    'maps HTTP %i to %s and leaves the store unchanged',
    async (status, kind) => {
      const { store, ctx } = await started();
      const before = new Map(store.data);
      global.fetch = jest.fn(async () =>
        json({ error: 'x' }, status),
      ) as typeof fetch;
      const err = await trigger.poll(ctx).catch((e) => e);
      expect(err).toBeInstanceOf(ActionError);
      expect(err.kind).toBe(kind);
      expect(store.data).toEqual(before);
    },
  );

  it('fails as auth_expired without a credential', async () => {
    const err = await trigger
      .poll({ ...makeCtx(), credential: undefined })
      .catch((e) => e);
    expect(err.kind).toBe('auth_expired');
  });

  it('test() previews the chosen file, or the latest edited files in the folder', async () => {
    const store = new MemoryStore();
    const one = await trigger.test!(
      makeCtx(store, { folder_id: 'folder1', file_id: 'a' }),
    );
    expect(one.map((e) => e.data.file_id)).toEqual(['a']);

    const many = await trigger.test!(makeCtx(store, { folder_id: 'folder1' }));
    expect(many.map((e) => e.data.file_id)).toEqual(['x', 'y']);
    expect(store.data.size).toBe(0);
  });

  it('offers the files in the selected folder as file_id choices', async () => {
    global.fetch = jest.fn(async (input: string | URL) => {
      const q = new URL(String(input)).searchParams.get('q');
      expect(q).toBe(
        "'folder1' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'",
      );
      return json({ files: [{ id: 'a', name: 'Budget' }] });
    }) as typeof fetch;
    await expect(
      trigger.inputFields[1].dynamicChoices!(makeCtx()),
    ).resolves.toEqual([{ value: 'a', label: 'Budget' }]);
  });
});
