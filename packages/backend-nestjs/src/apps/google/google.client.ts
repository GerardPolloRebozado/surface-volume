import { ActionError } from '../../workflow';
import type { RunContext } from '../../workflow';

/** Reads the OAuth access token from the run context, or fails as auth_expired. */
export function getAccessToken(ctx: RunContext, service: string): string {
  const token = ctx.credential?.credentials?.accessToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new ActionError(`Missing ${service} access token`, 'auth_expired');
  }
  return token;
}

/** GETs a Google API URL and maps failures to {@link ActionError} kinds. */
export async function googleGet<T>(
  service: string,
  url: string,
  token: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
  } catch (err) {
    throw new ActionError(
      `${service} request failed: ${(err as Error).message}`,
      'retryable',
    );
  }
  if (res.ok) {
    return (await res.json()) as T;
  }
  const detail = await res.text().catch(() => '');
  const message = `${service} API ${res.status}: ${detail}`.trim();
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
