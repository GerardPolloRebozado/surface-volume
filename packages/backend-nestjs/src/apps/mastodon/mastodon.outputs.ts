import type { OutputField } from '../../workflow';

export const statusOutputFields: OutputField[] = [
  { key: 'id', label: 'Status id', type: 'string' },
  { key: 'url', label: 'Status URL', type: 'string' },
  { key: 'createdAt', label: 'Created at', type: 'string' },
];

export const statusSample = {
  id: '109460000000000001',
  url: 'https://mastodon.social/@you/109460000000000001',
  createdAt: '2026-11-24T10:00:00.000Z',
};

export const notificationOutputFields: OutputField[] = [
  { key: 'notificationId', label: 'Notification id', type: 'string' },
  { key: 'type', label: 'Type', type: 'string' },
  { key: 'account', label: 'Account', type: 'string' },
  { key: 'accountId', label: 'Account id', type: 'string' },
  { key: 'statusUrl', label: 'Status URL', type: 'string' },
  { key: 'statusContent', label: 'Status content', type: 'text' },
  { key: 'createdAt', label: 'Created at', type: 'string' },
];

export const notificationSample = {
  notificationId: '109460000000000002',
  type: 'mention',
  account: '@friend@mastodon.social',
  accountId: '109460000000000006',
  statusUrl: 'https://mastodon.social/@friend/109460000000000003',
  statusContent: '<p>Hello there</p>',
  createdAt: '2026-11-24T10:00:00.000Z',
};

export const accountOutputFields: OutputField[] = [
  { key: 'id', label: 'Account id', type: 'string' },
  { key: 'acct', label: 'Handle', type: 'string' },
  { key: 'displayName', label: 'Display name', type: 'string' },
  { key: 'followers', label: 'Followers', type: 'number' },
  { key: 'statuses', label: 'Statuses', type: 'number' },
];

export const accountSample = {
  id: '109460000000000004',
  acct: 'friend@mastodon.social',
  displayName: 'Friend',
  followers: 42,
  statuses: 7,
};

export const timelineOutputFields: OutputField[] = [
  { key: 'statusId', label: 'Status id', type: 'string' },
  { key: 'account', label: 'Account', type: 'string' },
  { key: 'accountId', label: 'Account id', type: 'string' },
  { key: 'content', label: 'Content', type: 'text' },
  { key: 'url', label: 'URL', type: 'string' },
  { key: 'createdAt', label: 'Created at', type: 'string' },
];

export const timelineSample = {
  statusId: '109460000000000005',
  account: '@friend@mastodon.social',
  accountId: '109460000000000006',
  content: '<p>#hello world</p>',
  url: 'https://mastodon.social/@friend/109460000000000005',
  createdAt: '2026-11-24T10:00:00.000Z',
};
