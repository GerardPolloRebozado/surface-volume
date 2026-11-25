import type {
  PollingTrigger,
  RunContext,
  TriggerEvent,
} from '../../../workflow';
import {
  escapeQueryValue,
  FOLDER_MIME,
  getAccessToken,
  getFile,
  getStartPageToken,
  listChanges,
  listFiles,
} from '../drive.client';
import type { DriveFile } from '../drive.client';
import { fileChoices, folderChoices } from '../drive.choices';
import { toModifiedEvent } from '../drive.parse';

/**
 * Re-scan window (ms): an edit whose modifiedTime is older than the previous
 * poll minus this is treated as already handled. This filters out the
 * metadata-only changes (views, stars, renames, sharing) that changes.list also
 * reports, while tolerating a little indexing lag.
 */
export const OVERLAP_MS = 5 * 60 * 1000;
export const CHANGES_MAX_PAGES = 10;
export const MODIFIED_FIELDS =
  'id,name,mimeType,webViewLink,modifiedTime,parents,trashed,lastModifyingUser(displayName,emailAddress)';

const TOKEN_KEY = 'page_token';
const LAST_POLL_KEY = 'last_poll';
const SEEN_KEY = 'seen';
const ROOT_ID_KEY = 'root_id';

/** file id -> modifiedTime (epoch ms) of the last edit we fired for */
type SeenMap = Record<string, number>;

function readInputs(ctx: RunContext) {
  return {
    folderId: String(ctx.inputs?.folder_id ?? '').trim() || 'root',
    fileId: String(ctx.inputs?.file_id ?? '').trim(),
  };
}

/** Changes report real parent IDs, so the `root` alias must be resolved. */
async function resolveFolderId(
  ctx: RunContext,
  token: string,
  folderId: string,
): Promise<string> {
  if (folderId !== 'root') return folderId;
  const cached = await ctx.store.get<string>(ROOT_ID_KEY);
  if (cached) return cached;
  const root = await getFile(token, 'root', 'id');
  await ctx.store.set(ROOT_ID_KEY, root.id);
  return root.id;
}

function isWatched(f: DriveFile, folderId: string, fileId: string): boolean {
  if (f.trashed) return false;
  if (fileId) return f.id === fileId;
  return f.mimeType !== FOLDER_MIME && (f.parents ?? []).includes(folderId);
}

export const fileUpdated: PollingTrigger = {
  key: 'file_updated',
  name: 'File updated',
  description:
    'Fires when a chosen file, or any file inside a chosen folder, is modified.',
  type: 'polling',
  defaultIntervalSec: 120,
  inputFields: [
    {
      key: 'folder_id',
      label: 'Folder',
      type: 'select',
      required: true,
      altersDynamicFields: true,
      dynamicChoices: folderChoices,
    },
    {
      key: 'file_id',
      label: 'File',
      type: 'select',
      required: false,
      helpText: 'Leave empty to watch every file in the folder.',
      dynamicChoices: fileChoices,
    },
  ],
  outputFields: [
    { key: 'file_id', label: 'File ID', type: 'string' },
    { key: 'name', label: 'Name', type: 'string' },
    { key: 'web_view_link', label: 'Link', type: 'string' },
    { key: 'modified_time', label: 'Modified at', type: 'datetime' },
    {
      key: 'last_modifying_user',
      label: 'Last modified by',
      type: 'string',
    },
  ],
  sample: {
    file_id: '1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
    name: 'Budget 2026',
    web_view_link:
      'https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit',
    modified_time: '2026-11-25T09:30:00.000Z',
    last_modifying_user: 'colleague@example.com',
  },

  async poll(ctx: RunContext): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const now = Date.now();
    const pageToken = await ctx.store.get<string>(TOKEN_KEY);

    // First run: start watching from now, fire nothing.
    if (pageToken === undefined) {
      await ctx.store.set(TOKEN_KEY, await getStartPageToken(token));
      await ctx.store.set(LAST_POLL_KEY, now);
      return [];
    }

    const { fileId, folderId: rawFolderId } = readInputs(ctx);
    const folderId = fileId
      ? rawFolderId
      : await resolveFolderId(ctx, token, rawFolderId);
    const lastPoll = (await ctx.store.get<number>(LAST_POLL_KEY)) ?? now;
    const floor = lastPoll - OVERLAP_MS;
    const seen = (await ctx.store.get<SeenMap>(SEEN_KEY)) ?? {};

    const { changes, nextToken, complete } = await listChanges(
      token,
      pageToken,
      MODIFIED_FIELDS,
      { maxPages: CHANGES_MAX_PAGES },
    );

    const nextSeen: SeenMap = {};
    for (const [id, ts] of Object.entries(seen)) {
      if (ts >= floor) nextSeen[id] = ts;
    }
    const events: TriggerEvent[] = [];
    for (const change of changes) {
      const f = change.file;
      if (!f || change.removed || !isWatched(f, folderId, fileId)) continue;
      const modified = Date.parse(f.modifiedTime ?? '');
      if (!Number.isFinite(modified)) continue;
      if (modified <= Math.max(floor, nextSeen[f.id] ?? -Infinity)) continue;
      nextSeen[f.id] = modified;
      events.push(toModifiedEvent(f));
    }
    events.sort((a, b) =>
      (a.occurredAt ?? '').localeCompare(b.occurredAt ?? ''),
    );

    // Only persist after every page succeeded, so a failed poll retries.
    // When the page cap cut the backlog short, keep last_poll so the remaining
    // (older) edits still pass the floor on the next poll.
    await ctx.store.set(TOKEN_KEY, nextToken);
    await ctx.store.set(SEEN_KEY, nextSeen);
    if (complete) await ctx.store.set(LAST_POLL_KEY, now);
    return events;
  },

  async test(ctx: RunContext): Promise<TriggerEvent[]> {
    const token = getAccessToken(ctx);
    const { folderId, fileId } = readInputs(ctx);
    if (fileId) {
      return [toModifiedEvent(await getFile(token, fileId, MODIFIED_FIELDS))];
    }
    const { files } = await listFiles(
      token,
      `'${escapeQueryValue(folderId)}' in parents and trashed = false and mimeType != '${FOLDER_MIME}'`,
      {
        maxPages: 1,
        pageSize: 3,
        orderBy: 'modifiedTime desc',
        fields: MODIFIED_FIELDS,
      },
    );
    return files.map(toModifiedEvent);
  },
};
