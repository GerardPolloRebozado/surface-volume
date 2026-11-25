import type { RunContext } from '../../workflow';
import {
  getAccessToken as getGoogleAccessToken,
  googleGet,
} from '../google/google.client';

const BASE_URL = 'https://www.googleapis.com/drive/v3';
export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const FILE_FIELDS =
  'id,name,mimeType,webViewLink,createdTime,owners(emailAddress),size';

export interface DriveFile {
  id: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
  createdTime?: string;
  owners?: { emailAddress?: string }[];
  /** int64 encoded as a string; absent for Google Docs/Sheets/etc. */
  size?: string;
  modifiedTime?: string;
  parents?: string[];
  trashed?: boolean;
  lastModifyingUser?: { displayName?: string; emailAddress?: string };
}

interface ListResponse {
  files?: DriveFile[];
  nextPageToken?: string;
}

export interface FilePage {
  files: DriveFile[];
  /** false when `maxPages` was reached and more results exist. */
  complete: boolean;
}

export interface ListOptions {
  maxPages?: number;
  pageSize?: number;
  orderBy?: string;
  fields?: string;
}

export function getAccessToken(ctx: RunContext): string {
  return getGoogleAccessToken(ctx, 'Google Drive');
}

/** Escapes a value for use inside a single-quoted Drive `q` string. */
export function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Lists files matching `q`, following at most `maxPages` pages. */
export async function listFiles(
  token: string,
  q: string,
  {
    maxPages = 5,
    pageSize = 1000,
    orderBy = 'createdTime desc',
    fields = FILE_FIELDS,
  }: ListOptions = {},
): Promise<FilePage> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      q,
      fields: `nextPageToken,files(${fields})`,
      pageSize: String(pageSize),
      orderBy,
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const body = await googleGet<ListResponse>(
      'Google Drive',
      `${BASE_URL}/files?${params}`,
      token,
    );
    files.push(...(body.files ?? []));
    pageToken = body.nextPageToken;
    if (!pageToken) return { files, complete: true };
  }
  return { files, complete: false };
}

/** Lists the user's (non-trashed) folders by name. */
export async function listFolders(token: string): Promise<DriveFile[]> {
  const { files } = await listFiles(
    token,
    `mimeType = '${FOLDER_MIME}' and trashed = false`,
    { maxPages: 3, orderBy: 'name', fields: 'id,name' },
  );
  return files;
}

export interface DriveChange {
  fileId?: string;
  removed?: boolean;
  time?: string;
  file?: DriveFile;
}

interface ChangesResponse {
  changes?: DriveChange[];
  nextPageToken?: string;
  newStartPageToken?: string;
}

export interface ChangesPage {
  changes: DriveChange[];
  /** Token to resume from on the next poll. */
  nextToken: string;
  /** false when `maxPages` was reached and more changes are pending. */
  complete: boolean;
}

const ALL_DRIVES = 'supportsAllDrives=true&includeItemsFromAllDrives=true';

/** changes.getStartPageToken: the token for "changes from now on". */
export async function getStartPageToken(token: string): Promise<string> {
  const body = await googleGet<{ startPageToken: string }>(
    'Google Drive',
    `${BASE_URL}/changes/startPageToken?supportsAllDrives=true`,
    token,
  );
  return body.startPageToken;
}

/** changes.list from `pageToken`, following at most `maxPages` pages. */
export async function listChanges(
  token: string,
  pageToken: string,
  fileFields: string,
  { maxPages = 10, pageSize = 1000 } = {},
): Promise<ChangesPage> {
  const changes: DriveChange[] = [];
  let current = pageToken;
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      pageToken: current,
      pageSize: String(pageSize),
      includeRemoved: 'false',
      fields: `nextPageToken,newStartPageToken,changes(fileId,removed,time,file(${fileFields}))`,
    });
    const body = await googleGet<ChangesResponse>(
      'Google Drive',
      `${BASE_URL}/changes?${params}&${ALL_DRIVES}`,
      token,
    );
    changes.push(...(body.changes ?? []));
    if (body.newStartPageToken) {
      return { changes, nextToken: body.newStartPageToken, complete: true };
    }
    if (!body.nextPageToken) {
      return { changes, nextToken: current, complete: true };
    }
    current = body.nextPageToken;
  }
  return { changes, nextToken: current, complete: false };
}

/** files.get with the given fields (`fileId` may be the `root` alias). */
export function getFile(
  token: string,
  fileId: string,
  fields: string,
): Promise<DriveFile> {
  const params = new URLSearchParams({ fields, supportsAllDrives: 'true' });
  return googleGet<DriveFile>(
    'Google Drive',
    `${BASE_URL}/files/${encodeURIComponent(fileId)}?${params}`,
    token,
  );
}
