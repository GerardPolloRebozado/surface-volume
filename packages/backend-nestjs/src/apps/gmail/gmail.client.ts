import type { RunContext } from '../../workflow';
import {
  getAccessToken as getGoogleAccessToken,
  googleGet,
} from '../google/google.client';

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
  return getGoogleAccessToken(ctx, 'Gmail');
}

function gmailGet<T>(token: string, path: string): Promise<T> {
  return googleGet<T>('Gmail', `${BASE_URL}${path}`, token);
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
