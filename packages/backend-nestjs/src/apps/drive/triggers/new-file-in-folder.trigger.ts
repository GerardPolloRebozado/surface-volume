import type {
  PollingTrigger,
  RunContext,
  TriggerEvent,
} from '../../../workflow';
import {
  escapeQueryValue,
  FOLDER_MIME,
  getAccessToken,
  listFiles,
  listFolders,
} from '../drive.client';
import { toFileEvent } from '../drive.parse';

/** Drive's max page size; 5 pages covers folders of up to 5,000 files. */
export const FOLDER_PAGE_SIZE = 1000;
export const FOLDER_MAX_PAGES = 5;
const FILES_KEY = 'files';

const MIME_CLAUSES: Record<string, string> = {
  document:
    "(mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')",
  spreadsheet:
    "(mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')",
  pdf: "mimeType = 'application/pdf'",
  image: "mimeType contains 'image/'",
};

/** Builds the files.list query for the folder and optional type filter. */
export function buildQuery(ctx: RunContext): string {
  const folderId = String(ctx.inputs?.folder_id ?? '').trim() || 'root';
  const mime = String(ctx.inputs?.mime_type ?? 'any');
  const clauses = [
    `'${escapeQueryValue(folderId)}' in parents`,
    'trashed = false',
    `mimeType != '${FOLDER_MIME}'`,
  ];
  if (MIME_CLAUSES[mime]) clauses.push(MIME_CLAUSES[mime]);
  return clauses.join(' and ');
}

export const newFileInFolder: PollingTrigger = {
  key: 'new_file_in_folder',
  name: 'New file in folder',
  description:
    'Fires when a file is created in, or moved into, a Google Drive folder.',
  type: 'polling',
  defaultIntervalSec: 120,
  inputFields: [
    {
      key: 'folder_id',
      label: 'Folder',
      type: 'select',
      required: true,
      async dynamicChoices(ctx) {
        const folders = await listFolders(getAccessToken(ctx));
        return [
          { value: 'root', label: 'My Drive (root)' },
          ...folders.map((f) => ({ value: f.id, label: f.name ?? f.id })),
        ];
      },
    },
    {
      key: 'mime_type',
      label: 'File type',
      type: 'select',
      required: false,
      default: 'any',
      choices: [
        { value: 'any', label: 'Any' },
        { value: 'document', label: 'Document' },
        { value: 'spreadsheet', label: 'Spreadsheet' },
        { value: 'pdf', label: 'PDF' },
        { value: 'image', label: 'Image' },
      ],
    },
  ],
  outputFields: [
    { key: 'file_id', label: 'File ID', type: 'string' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'mime_type', label: 'MIME type', type: 'string' },
    { key: 'web_view_link', label: 'Link', type: 'string' },
    { key: 'created_time', label: 'Created at', type: 'datetime' },
    { key: 'owner_email', label: 'Owner email', type: 'string' },
    { key: 'size', label: 'Size (bytes)', type: 'number' },
  ],
  sample: {
    file_id: '1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
    name: 'Invoice 2026-11.pdf',
    mime_type: 'application/pdf',
    web_view_link:
      'https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view',
    created_time: '2026-11-19T09:30:00.000Z',
    owner_email: 'me@example.com',
    size: 48213,
  },

  async poll(ctx: RunContext): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const { files, complete } = await listFiles(token, buildQuery(ctx), {
      maxPages: FOLDER_MAX_PAGES,
      pageSize: FOLDER_PAGE_SIZE,
    });
    const ids = files.map((f) => f.id);
    const stored = await ctx.store.get<string[]>(FILES_KEY);

    // First run: record the folder's current contents, fire nothing.
    if (stored === undefined) {
      await ctx.store.set(FILES_KEY, ids);
      return [];
    }

    const known = new Set(stored);
    const events = files
      .filter((f) => !known.has(f.id))
      .map(toFileEvent)
      .sort((a, b) => (a.occurredAt ?? '').localeCompare(b.occurredAt ?? ''));

    // A complete listing replaces the set, so moving a file out and back in
    // fires again. A truncated one can't tell "removed" from "past the page
    // cap", so it keeps old IDs to avoid re-firing them later.
    const next = complete ? ids : [...new Set([...stored, ...ids])];
    await ctx.store.set(FILES_KEY, next);
    return events;
  },

  async test(ctx: RunContext): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const { files } = await listFiles(token, buildQuery(ctx), {
      maxPages: 1,
      pageSize: 3,
    });
    return files.map(toFileEvent);
  },
};
