import type { TriggerEvent } from '../../../workflow';
import { mastodonPollingTrigger } from './poll-helpers';
import { toNotificationEvent } from '../mastodon.parse';
import type { MastodonNotification } from '../mastodon.client';
import { notificationOutputFields, notificationSample, timelineOutputFields, timelineSample } from '../mastodon.outputs';

function notificationsPath(type: string): () => string {
  return () => `/api/v1/notifications?types[]=${type}`;
}

function directMessageEvent(item: Record<string, unknown>): TriggerEvent {
  const value = (item.account ?? {}) as Record<string, unknown>;
  return {
    id: String(item.id),
    occurredAt: typeof item.created_at === 'string' ? item.created_at : undefined,
    data: {
      statusId: String(item.id),
      account: typeof value.acct === 'string' ? value.acct : `@${String(value.username ?? 'unknown')}`,
      accountId: typeof value.id === 'string' ? value.id : '',
      content: typeof item.content === 'string' ? item.content : '',
      url: typeof item.url === 'string' ? item.url : '',
      createdAt: typeof item.created_at === 'string' ? item.created_at : '',
    },
  };
}

export const newMention = mastodonPollingTrigger({
  key: 'new_mention',
  name: 'New mention',
  description: 'Fires when someone mentions you.',
  inputFields: [],
  outputFields: notificationOutputFields,
  sample: notificationSample,
  cursorKey: 'mentions:seen',
  path: notificationsPath('mention'),
  map: (item) => toNotificationEvent(item as unknown as MastodonNotification),
});

export const newFavourite = mastodonPollingTrigger({
  key: 'new_favourite',
  name: 'New favourite',
  description: 'Fires when someone favourites one of your statuses.',
  inputFields: [],
  outputFields: notificationOutputFields,
  sample: notificationSample,
  cursorKey: 'favourites:seen',
  path: notificationsPath('favourite'),
  map: (item) => toNotificationEvent(item as unknown as MastodonNotification),
});

export const newPollVote = mastodonPollingTrigger({
  key: 'new_poll_vote',
  name: 'New poll vote',
  description: 'Fires when someone votes in one of your polls.',
  inputFields: [],
  outputFields: notificationOutputFields,
  sample: notificationSample,
  cursorKey: 'polls:seen',
  path: notificationsPath('poll'),
  map: (item) => toNotificationEvent(item as unknown as MastodonNotification),
});

export const newDirectMessage = mastodonPollingTrigger({
  key: 'new_direct_message',
  name: 'New direct message',
  description: 'Fires when you receive a direct status.',
  inputFields: [],
  outputFields: timelineOutputFields,
  sample: timelineSample,
  cursorKey: 'direct:seen',
  path: () => '/api/v1/timelines/direct',
  map: directMessageEvent,
});
