import type { KeyValueStore, RunContext } from '../../workflow';

/** Test doubles shared by the Gmail trigger specs. */

export class MemoryStore implements KeyValueStore {
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

export type Msg = { id: string; internalDate: number };

/** Fake Gmail API: `inbox` is newest-first; list ignores the query except for recording it. */
export function fakeGmail(inbox: Msg[], opts: { pageSize?: number } = {}) {
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

export function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export function makeCtx(
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
