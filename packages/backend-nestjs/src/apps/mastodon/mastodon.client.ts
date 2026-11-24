import { ActionError } from '../../workflow';
import type { RunContext } from '../../workflow';
import { assertSafeBaseUrl } from '../../connections/egress';

export interface MastodonCredential {
  instanceUrl: string;
  accessToken: string;
}

export interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  followers_count?: number;
  following_count?: number;
  statuses_count?: number;
}

export interface MastodonStatus {
  id: string;
  url: string;
  content: string;
  created_at: string;
}

export interface MastodonNotification {
  id: string;
  type: string;
  created_at: string;
  account?: MastodonAccount;
  status?: MastodonStatus;
}

export interface MastodonAppToken {
  scopes: string[];
}

export function readCredential(credentials: Record<string, unknown>): MastodonCredential {
  const instanceUrl = credentials.instanceUrl;
  const accessToken = credentials.accessToken;
  if (typeof instanceUrl !== 'string' || typeof accessToken !== 'string' || !accessToken) {
    throw new ActionError('Mastodon needs an instance URL and an access token', 'auth_expired');
  }
  return { instanceUrl: assertSafeBaseUrl(instanceUrl), accessToken: accessToken.trim() };
}

export function contextCredential(ctx: RunContext): MastodonCredential {
  return readCredential(ctx.credential?.credentials ?? {});
}

export async function request<T>(credential: MastodonCredential, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${credential.instanceUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${credential.accessToken}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new ActionError(`Mastodon request failed: ${(error as Error).message}`, 'retryable');
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  const detail = await response.text().catch(() => '');
  const message = `Mastodon ${response.status}: ${detail.slice(0, 300)}`.trim();
  if (response.status === 401 || response.status === 403) {
    throw new ActionError(message, 'auth_expired');
  }
  if (response.status === 429) {
    const reset = response.headers.get('x-ratelimit-reset');
    const seconds = Number(response.headers.get('retry-after'));
    const resetMs = reset ? Date.parse(reset) - Date.now() : Number.NaN;
    const retryMs =
      Number.isFinite(seconds) && seconds > 0
        ? seconds * 1000
        : Number.isFinite(resetMs) && resetMs > 0
          ? Math.min(resetMs, 300_000)
          : undefined;
    throw new ActionError(message, 'rate_limited', retryMs);
  }
  if (response.status >= 500) {
    throw new ActionError(message, 'retryable');
  }
  throw new ActionError(message, 'fatal');
}

export async function verifyCredential(credentials: Record<string, unknown>) {
  const credential = readCredential(credentials);
  const account = await request<MastodonAccount>(
    credential,
    '/api/v1/accounts/verify_credentials',
  );
  let scopes: string[] = [];
  try {
    const token = await request<MastodonAppToken>(
      credential,
      '/api/v1/apps/verify_credentials',
    );
    scopes = Array.isArray(token.scopes) ? token.scopes : [];
  } catch {
    scopes = [];
  }
  const host = new URL(credential.instanceUrl).host;
  const acct = account.acct?.includes('@') ? account.acct : `${account.username ?? account.acct}@${host}`;
  const label = account.display_name?.trim();
  return {
    externalAccountId: `${account.id}@${host}`,
    displayName: label ? `${label} (@${acct})` : `@${acct}`,
    scopes,
  };
}

export interface PostStatusInput {
  status: string;
  visibility?: string;
  language?: string;
  spoilerText?: string;
  inReplyToId?: string;
}

export function statusBody(input: PostStatusInput): Record<string, unknown> {
  const body: Record<string, unknown> = { status: input.status };
  if (input.visibility) body.visibility = input.visibility;
  if (input.language) body.language = input.language;
  if (input.spoilerText) body.spoiler_text = input.spoilerText;
  if (input.inReplyToId) body.in_reply_to_id = input.inReplyToId;
  return body;
}

export function idempotencyKey(runId?: string, nodeId?: string): string {
  return `${runId ?? 'manual'}:${nodeId ?? 'node'}`;
}

export async function postStatus(
  credential: MastodonCredential,
  input: PostStatusInput,
  key: string,
): Promise<MastodonStatus> {
  return request<MastodonStatus>(credential, '/api/v1/statuses', {
    method: 'POST',
    body: JSON.stringify(statusBody(input)),
    headers: { 'Idempotency-Key': key },
  });
}

export async function listNotifications(
  credential: MastodonCredential,
  params: URLSearchParams,
): Promise<MastodonNotification[]> {
  return request<MastodonNotification[]>(
    credential,
    `/api/v1/notifications?${params.toString()}`,
  );
}

export async function listStatuses(
  credential: MastodonCredential,
  params: URLSearchParams,
): Promise<MastodonStatus[]> {
  return request<MastodonStatus[]>(credential, `/api/v1/accounts/verify_credentials/statuses?${params.toString()}`);
}

export async function getAccount(
  credential: MastodonCredential,
  id: string,
): Promise<MastodonAccount> {
  return request<MastodonAccount>(credential, `/api/v1/accounts/${encodeURIComponent(id)}`);
}

export async function searchAccounts(
  credential: MastodonCredential,
  query: string,
  limit = 10,
): Promise<MastodonAccount[]> {
  const params = new URLSearchParams({ q: query, type: 'accounts', limit: String(limit) });
  return request<MastodonAccount[]>(credential, `/api/v2/search?${params.toString()}`);
}

export async function mastodonRequest(
  credential: MastodonCredential,
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  return request<unknown>(credential, path, init);
}

