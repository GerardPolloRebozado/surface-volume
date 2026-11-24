import type { TriggerEvent } from '../../workflow';
import type { MastodonNotification } from './mastodon.client';

export const NOTIFICATION_CURSOR = 'notifications:seen';

export function notificationId(item: MastodonNotification): string | undefined {
  return typeof item?.id === 'string' && item.id.length > 0 ? item.id : undefined;
}

export function latestNotificationId(items: MastodonNotification[]): string | undefined {
  const ids = items
    .map(notificationId)
    .filter((id): id is string => id !== undefined)
    .sort((a, b) => {
      try {
        const left = BigInt(a);
        const right = BigInt(b);
        return left < right ? -1 : left > right ? 1 : 0;
      } catch {
        return a < b ? -1 : a > b ? 1 : 0;
      }
    });
  return ids.at(-1);
}

export function toNotificationEvent(item: MastodonNotification): TriggerEvent {
  const account = item.account;
  const acct = account?.acct
    ? account.acct
    : account?.username
      ? `@${account.username}`
      : 'unknown';
  return {
    id: item.id,
    occurredAt: item.created_at,
    data: {
      notificationId: item.id,
      type: item.type,
      account: acct,
      accountId: typeof item.account?.id === 'string' ? item.account.id : '',
      statusUrl: item.status?.url ?? '',
      statusContent: item.status?.content ?? '',
      createdAt: item.created_at,
    },
  };
}
