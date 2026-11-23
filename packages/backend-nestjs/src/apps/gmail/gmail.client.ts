import { ActionError } from '../../workflow';
import type { RunContext } from '../../workflow';

const BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const PAGE_SIZE = 100;

export interface GmailMessagePartBody {
  size?: number;
  data?: string;
  attachmentId?: string;
}

export interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: GmailMessagePartBody;
  parts?: GmailMessagePart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePart;
}

interface ListResponse {
  messages?: { id: string; threadId: string }[];
  nextPageToken?: string;
}

/** Reads the OAuth access token from the run context, or fails as auth_expired. */
export function getAccessToken(ctx: RunContext): string {
  const token = ctx.credential?.credentials?.accessToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new ActionError('Missing Gmail access token', 'auth_expired');
  }
  return token;
}

async function gmailGet<T>(token: string, path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
  } catch (err) {
    throw new ActionError(
      `Gmail request failed: ${(err as Error).message}`,
      'retryable',
    );
  }
  if (res.ok) {
    return (await res.json()) as T;
  }
  const detail = await res.text().catch(() => '');
  const message = `Gmail API ${res.status}: ${detail}`.trim();
  if (res.status === 401) throw new ActionError(message, 'auth_expired');
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after'));
    throw new ActionError(
      message,
      'rate_limited',
      Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : undefined,
    );
  }
  if (res.status >= 500) throw new ActionError(message, 'retryable');
  throw new ActionError(message, 'fatal');
}

export interface MessageIdPage {
  ids: string[];
  /** false when `maxPages` was reached and more results exist. */
  complete: boolean;
}

/** Lists message IDs matching `q`, newest first, following at most `maxPages` pages. */
export async function listAllMessageIds(
  token: string,
  q: string,
  maxPages = 5,
  pageSize = PAGE_SIZE,
): Promise<MessageIdPage> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({ q, maxResults: String(pageSize) });
    if (pageToken) params.set('pageToken', pageToken);
    const body = await gmailGet<ListResponse>(token, `/messages?${params}`);
    for (const m of body.messages ?? []) ids.push(m.id);
    pageToken = body.nextPageToken;
    if (!pageToken) return { ids, complete: true };
  }
  return { ids, complete: false };
}

/** Like {@link listAllMessageIds} but returns only the IDs. */
export async function listMessageIds(
  token: string,
  q: string,
  maxPages = 5,
  pageSize = PAGE_SIZE,
): Promise<string[]> {
  return (await listAllMessageIds(token, q, maxPages, pageSize)).ids;
}

export function getMessage(token: string, id: string): Promise<GmailMessage> {
  return gmailGet<GmailMessage>(
    token,
    `/messages/${encodeURIComponent(id)}?format=full`,
  );
}
