import type { PollingPlan, PollingTrigger, RunContext, TriggerEvent } from '../../../workflow';
import { contextCredential, listNotifications, type MastodonNotification } from '../mastodon.client';
import { latestNotificationId, NOTIFICATION_CURSOR, toNotificationEvent } from '../mastodon.parse';
import { notificationOutputFields, notificationSample } from '../mastodon.outputs';

const TYPES = [
  { value: 'mention', label: 'Mentions' },
  { value: 'status', label: 'New statuses' },
  { value: 'reblog', label: 'Boosts' },
  { value: 'favourite', label: 'Favourites' },
  { value: 'follow', label: 'New followers' },
  { value: 'poll', label: 'Poll results' },
];
const LIMIT = 80;

function selectedTypes(ctx: RunContext): string[] {
  const raw = ctx.inputs?.types;
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  const allowed = new Set(TYPES.map((item) => item.value));
  const selected = values
    .map((value) => String(value).trim())
    .filter((value) => allowed.has(value));
  return selected.length > 0 ? selected : ['mention', 'status'];
}

function asList(outputs: Record<string, unknown>): MastodonNotification[] {
  const value = outputs?.notifications;
  return Array.isArray(value) ? (value as MastodonNotification[]) : [];
}

function newerThan(items: MastodonNotification[], cursor: string): MastodonNotification[] {
  return items.filter((item) => {
    try {
      return BigInt(item.id) > BigInt(cursor);
    } catch {
      return item.id > cursor;
    }
  });
}

export const newNotificationTrigger: PollingTrigger = {
  key: 'new_notification',
  name: 'New notification',
  description: 'Fires for new notifications on the connected Mastodon account.',
  type: 'polling',
  defaultIntervalSec: 60,
  inputFields: [
    {
      key: 'types',
      label: 'Notification types',
      type: 'select',
      list: true,
      default: ['mention', 'status'],
      choices: TYPES,
      helpText: 'Leave empty to watch mentions and new statuses.',
    },
  ],
  outputFields: notificationOutputFields,
  sample: notificationSample,

  async plan(ctx: RunContext): Promise<PollingPlan> {
    const credential = contextCredential(ctx);
    const cursor = await ctx.store.get<string>(NOTIFICATION_CURSOR);
    const params = new URLSearchParams({ limit: String(LIMIT) });
    for (const type of selectedTypes(ctx)) params.append('types[]', type);
    if (cursor) params.set('since_id', cursor);

    return {
      calls: [
        {
          id: 'notifications',
          method: 'GET',
          url: `${credential.instanceUrl}/api/v1/notifications?${params.toString()}`,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${credential.accessToken}`,
          },
          outputs: { notifications: '$' },
        },
      ],
    };
  },

  async map(outputs: Record<string, unknown>, ctx: RunContext): Promise<TriggerEvent[]> {
    const items = asList(outputs);
    const latest = latestNotificationId(items);
    const previous = await ctx.store.get<string>(NOTIFICATION_CURSOR);

    if (previous === undefined) {
      if (latest) await ctx.store.set(NOTIFICATION_CURSOR, latest);
      return [];
    }

    const events = newerThan(items, previous).map(toNotificationEvent);
    if (latest) await ctx.store.set(NOTIFICATION_CURSOR, latest);
    return events;
  },
};
