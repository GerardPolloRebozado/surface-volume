import { ActionError } from '../../../workflow';
import {
  fakeDrive,
  file,
  json,
  makeCtx,
  MemoryStore,
} from '../drive.testing-spec';
import type { DriveFile } from '../drive.client';
import {
  buildQuery,
  FOLDER_MAX_PAGES,
  newFileInFolder as trigger,
} from './new-file-in-folder.trigger';

const BASE =
  "'folder1' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'";

describe('new_file_in_folder', () => {
  const realFetch = global.fetch;
  let folder: DriveFile[];
  let drive: ReturnType<typeof fakeDrive>;

  beforeEach(() => {
    folder = [
      file('a', '2026-11-20T10:00:00.000Z'),
      file('b', '2026-11-19T10:00:00.000Z'),
    ];
    drive = fakeDrive(folder, {
      folders: [
        { id: 'f1', name: 'Invoices' },
        { id: 'f2', name: 'Receipts' },
      ],
    });
    global.fetch = drive.fetchMock as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('declares a 120 s polling trigger with the spec outputs', () => {
    expect(trigger.type).toBe('polling');
    expect(trigger.defaultIntervalSec).toBe(120);
    expect(trigger.inputFields.map((f) => f.key)).toEqual([
      'folder_id',
      'mime_type',
    ]);
    expect(trigger.outputFields.map((f) => f.key)).toEqual([
      'file_id',
      'name',
      'mime_type',
      'web_view_link',
      'created_time',
      'owner_email',
      'size',
    ]);
  });

  it('records the folder contents on the first poll and fires nothing', async () => {
    const store = new MemoryStore();
    await expect(trigger.poll(makeCtx(store))).resolves.toEqual([]);
    expect(store.data.get('files')).toEqual(['a', 'b']);
    expect(drive.queries()).toEqual([BASE]);
    expect(drive.requests[0].get('orderBy')).toBe('createdTime desc');
    expect(drive.requests[0].get('supportsAllDrives')).toBe('true');
  });

  it('fires for new and moved-in files, oldest first, once', async () => {
    const store = new MemoryStore();
    const ctx = makeCtx(store);
    await trigger.poll(ctx);

    // A fresh upload, and an old file moved in (keeps its old createdTime).
    folder.unshift(file('new', '2026-11-25T10:00:00.000Z'));
    folder.push(file('moved', '2024-01-01T00:00:00.000Z'));

    const events = await trigger.poll(ctx);
    expect(events.map((e) => e.id)).toEqual(['moved', 'new']);
    expect(events[1]).toEqual({
      id: 'new',
      occurredAt: '2026-11-25T10:00:00.000Z',
      data: {
        file_id: 'new',
        name: 'new.pdf',
        mime_type: 'application/pdf',
        web_view_link: 'https://drive.google.com/file/d/new/view',
        created_time: '2026-11-25T10:00:00.000Z',
        owner_email: 'me@example.com',
        size: 1234,
      },
    });

    await expect(trigger.poll(ctx)).resolves.toEqual([]);
  });

  it('fires again when a file is moved out and back in', async () => {
    const store = new MemoryStore();
    const ctx = makeCtx(store);
    await trigger.poll(ctx);

    const [a] = folder.splice(0, 1);
    await expect(trigger.poll(ctx)).resolves.toEqual([]);
    expect(store.data.get('files')).toEqual(['b']);

    folder.unshift(a);
    const events = await trigger.poll(ctx);
    expect(events.map((e) => e.id)).toEqual(['a']);
  });

  it('keeps known IDs when the listing is cut off at the page cap', async () => {
    const many = Array.from({ length: FOLDER_MAX_PAGES * 2 + 1 }, (_, i) =>
      file(`m${i}`, new Date(Date.UTC(2026, 10, 25) - i * 1000).toISOString()),
    );
    const paged = fakeDrive(many, { pageSize: 2 });
    global.fetch = paged.fetchMock as typeof fetch;
    const store = new MemoryStore();
    store.data.set('files', ['m0', 'beyond']);

    const events = await trigger.poll(makeCtx(store));
    expect(paged.requests).toHaveLength(FOLDER_MAX_PAGES);
    expect(events).toHaveLength(FOLDER_MAX_PAGES * 2 - 1);
    expect(store.data.get('files')).toContain('beyond');
  });

  it('maps files without owners or size', async () => {
    folder.splice(0, folder.length, {
      id: 'doc',
      name: 'Notes',
      mimeType: 'application/vnd.google-apps.document',
      createdTime: '2026-11-25T10:00:00.000Z',
    });
    const [event] = await trigger.test!(makeCtx());
    expect(event.data).toMatchObject({
      owner_email: '',
      size: null,
      web_view_link: '',
    });
  });

  it.each([
    ['any', BASE],
    ['pdf', `${BASE} and mimeType = 'application/pdf'`],
    ['image', `${BASE} and mimeType contains 'image/'`],
    [
      'document',
      `${BASE} and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')`,
    ],
    [
      'spreadsheet',
      `${BASE} and (mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')`,
    ],
  ])('builds the query for mime_type=%s', (mime, expected) => {
    expect(
      buildQuery(makeCtx(undefined, { folder_id: 'folder1', mime_type: mime })),
    ).toBe(expected);
  });

  it('escapes quotes in the folder ID', () => {
    expect(buildQuery(makeCtx(undefined, { folder_id: "x'y\\z" }))).toMatch(
      /^'x\\'y\\\\z' in parents/,
    );
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
      store.data.set('files', ['a']);
      global.fetch = jest.fn(async () =>
        json({ error: 'x' }, status, { 'retry-after': '7' }),
      ) as typeof fetch;

      const err = await trigger.poll(makeCtx(store)).catch((e) => e);
      expect(err).toBeInstanceOf(ActionError);
      expect(err.kind).toBe(kind);
      if (kind === 'rate_limited') expect(err.retryAfterMs).toBe(7000);
      expect(store.data.get('files')).toEqual(['a']);
    },
  );

  it('fails as auth_expired without a credential', async () => {
    const ctx = { ...makeCtx(), credential: undefined };
    const err = await trigger.poll(ctx).catch((e) => e);
    expect(err).toBeInstanceOf(ActionError);
    expect(err.kind).toBe('auth_expired');
  });

  it('test() returns up to 3 newest files without touching the store', async () => {
    folder.push(
      file('c', '2026-11-18T10:00:00.000Z'),
      file('d', '2026-11-17T10:00:00.000Z'),
    );
    const store = new MemoryStore();
    const events = await trigger.test!(makeCtx(store));
    expect(events.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(store.data.size).toBe(0);
  });

  it('offers My Drive root plus the user folders as choices', async () => {
    const choices = await trigger.inputFields[0].dynamicChoices!(makeCtx());
    expect(choices).toEqual([
      { value: 'root', label: 'My Drive (root)' },
      { value: 'f1', label: 'Invoices' },
      { value: 'f2', label: 'Receipts' },
    ]);
    expect(drive.queries()).toEqual([
      "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    ]);
    expect(drive.requests[0].get('orderBy')).toBe('name');
  });
});
