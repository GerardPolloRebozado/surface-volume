import type { RunContext } from '../../workflow';
import { MemoryStore, json } from '../gmail/gmail.testing-spec';
import type { DriveFile } from './drive.client';

/** Test doubles shared by the Drive trigger specs. */

export { MemoryStore, json };

/** Fake Drive files.list: returns `files` in order, paged via `pageToken`. */
export function fakeDrive(
  files: DriveFile[],
  opts: { pageSize?: number; folders?: DriveFile[] } = {},
) {
  const requests: URLSearchParams[] = [];
  const fetchMock = jest.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    requests.push(url.searchParams);
    const q = url.searchParams.get('q')!;
    const source = q.includes(' in parents') ? files : (opts.folders ?? []);
    const size = opts.pageSize ?? Number(url.searchParams.get('pageSize'));
    const start = Number(url.searchParams.get('pageToken') ?? 0);
    return json({
      files: source.slice(start, start + size),
      nextPageToken:
        start + size < source.length ? String(start + size) : undefined,
    });
  });
  return {
    fetchMock,
    requests,
    queries: () => requests.map((p) => p.get('q')),
  };
}

export function file(id: string, createdTime: string): DriveFile {
  return {
    id,
    name: `${id}.pdf`,
    mimeType: 'application/pdf',
    webViewLink: `https://drive.google.com/file/d/${id}/view`,
    createdTime,
    owners: [{ emailAddress: 'me@example.com' }],
    size: '1234',
  };
}

export function makeCtx(
  store = new MemoryStore(),
  inputs: Record<string, unknown> = { folder_id: 'folder1' },
): RunContext {
  return {
    inputs,
    store,
    credential: {
      id: 'c1',
      userId: 'u1',
      appId: 'drive',
      displayName: 'me@example.com',
      credentials: { accessToken: 'tok' },
      status: 'active',
    },
  };
}
