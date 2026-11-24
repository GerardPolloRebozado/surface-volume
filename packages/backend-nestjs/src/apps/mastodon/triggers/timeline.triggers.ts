import type { RunContext, TriggerEvent } from '../../../workflow';
import { mastodonPollingTrigger } from './poll-helpers';
import { timelineOutputFields, timelineSample } from '../mastodon.outputs';

function account(item: Record<string, unknown>): string {
  const value = item.account as Record<string, unknown> | undefined;
  if (!value) return 'unknown';
  return typeof value.acct === 'string' && value.acct
    ? value.acct
    : `@${String(value.username ?? 'unknown')}`;
}

function statusEvent(item: Record<string, unknown>): TriggerEvent {
  return {
    id: String(item.id),
    occurredAt: typeof item.created_at === 'string' ? item.created_at : undefined,
    data: {
      statusId: String(item.id),
      account: account(item),
      accountId: String((item.account as Record<string, unknown> | undefined)?.id ?? ''),
      content: typeof item.content === 'string' ? item.content : '',
      url: typeof item.url === 'string' ? item.url : '',
      createdAt: typeof item.created_at === 'string' ? item.created_at : '',
    },
  };
}

function followEvent(item: Record<string, unknown>): TriggerEvent {
  const value = (item.account ?? {}) as Record<string, unknown>;
  return {
    id: String(item.id),
    occurredAt: typeof item.created_at === 'string' ? item.created_at : undefined,
    data: {
      notificationId: String(item.id),
      acct: typeof value.acct === 'string' ? value.acct : '',
      displayName: typeof value.display_name === 'string' ? value.display_name : '',
      accountId: typeof value.id === 'string' ? value.id : '',
    },
  };
}

export const newStatus = mastodonPollingTrigger({
  key: 'new_status',
  name: 'New status in home timeline',
  description: 'Fires when an account you follow publishes a new status.',
  inputFields: [],
  outputFields: timelineOutputFields,
  sample: timelineSample,
  cursorKey: 'timeline:seen',
  path: () => '/api/v1/timelines/home',
  map: statusEvent,
});

export const newFollower = mastodonPollingTrigger({
  key: 'new_follower',
  name: 'New follower',
  description: 'Fires when someone follows you.',
  inputFields: [],
  outputFields: [
    { key: 'notificationId', label: 'Notification id', type: 'string' },
    { key: 'acct', label: 'Handle', type: 'string' },
    { key: 'displayName', label: 'Display name', type: 'string' },
    { key: 'accountId', label: 'Account id', type: 'string' },
  ],
  sample: { notificationId: '1', acct: 'friend@mastodon.social', displayName: 'Friend', accountId: '42' },
  cursorKey: 'followers:seen',
  path: () => '/api/v1/notifications?types[]=follow',
  map: followEvent,
});

export const newHashtagStatus = mastodonPollingTrigger({
  key: 'new_hashtag_status',
  name: 'New status with hashtag',
  description: 'Fires when a new public status uses the chosen hashtag.',
  inputFields: [
    {
      key: 'hashtag',
      label: 'Hashtag',
      type: 'string',
      required: true,
      helpText: 'Without the #, for example: opensource',
    },
  ],
  outputFields: timelineOutputFields,
  sample: timelineSample,
  cursorKey: 'hashtag:seen',
  path: (ctx: RunContext) => {
    const hashtag = String(ctx.inputs?.hashtag ?? '').replace(/^#/, '').trim();
    return `/api/v1/timelines/tag/${encodeURIComponent(hashtag || 'mastodon')}`;
  },
  map: statusEvent,
});

export const newStatusFromAccount = mastodonPollingTrigger({
  key: 'new_status_from_account',
  name: 'New status from an account',
  description: 'Fires when a chosen account publishes a status.',
  inputFields: [
    {
      key: 'accountId',
      label: 'Account id',
      type: 'string',
      required: true,
      helpText: 'Find ids with the search action or your instance profile URL.',
    },
  ],
  outputFields: timelineOutputFields,
  sample: timelineSample,
  cursorKey: 'account-timeline:seen',
  path: (ctx: RunContext) => {
    const id = String(ctx.inputs?.accountId ?? '');
    return `/api/v1/accounts/${encodeURIComponent(id)}/statuses`;
  },
  map: statusEvent,
});
