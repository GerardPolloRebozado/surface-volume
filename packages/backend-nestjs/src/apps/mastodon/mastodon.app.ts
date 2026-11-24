import type { AppDefinition } from '../../workflow';
import { verifyCredential } from './mastodon.client';
import { postStatusAction } from './actions/post-status.action';
import {
  addToList,
  createList,
  favouriteStatus,
  followAccount,
  reblogStatus,
  updateProfile,
} from './actions/social.actions';
import {
  bookmarkStatus,
  deleteStatus,
  pinStatus,
  postPoll,
  unbookmarkStatus,
  unpinStatus,
} from './actions/status.actions';
import {
  blockAccount,
  muteAccount,
  reportAccount,
  unblockAccount,
  unmuteAccount,
} from './actions/moderation.actions';
import { newNotificationTrigger } from './triggers/new-notification.trigger';
import {
  newFollower,
  newHashtagStatus,
  newStatus,
  newStatusFromAccount,
} from './triggers/timeline.triggers';
import {
  newDirectMessage,
  newFavourite,
  newMention,
  newPollVote,
} from './triggers/notification.triggers';

const actions = [
  postStatusAction,
  favouriteStatus,
  reblogStatus,
  followAccount,
  createList,
  addToList,
  updateProfile,
  deleteStatus,
  bookmarkStatus,
  unbookmarkStatus,
  pinStatus,
  unpinStatus,
  postPoll,
  muteAccount,
  unmuteAccount,
  blockAccount,
  unblockAccount,
  reportAccount,
];

const triggers = [
  newNotificationTrigger,
  newStatus,
  newFollower,
  newHashtagStatus,
  newStatusFromAccount,
  newMention,
  newFavourite,
  newPollVote,
  newDirectMessage,
];

export const mastodonApp: AppDefinition = {
  id: 'mastodon',
  name: 'Mastodon',
  auth: {
    type: 'api_key',
    fields: [
      {
        key: 'instanceUrl',
        label: 'Instance URL',
        type: 'string',
        required: true,
        helpText: 'Your instance, for example https://mastodon.social',
      },
      {
        key: 'accessToken',
        label: 'Access token',
        type: 'string',
        required: true,
        secret: true,
        helpText: 'Preferences → Development → New application, with read:notifications and write:statuses.',
      },
    ],
  },
  verify: verifyCredential,
  triggers: Object.fromEntries(triggers.map((item) => [item.key, item])),
  actions: Object.fromEntries(actions.map((item) => [item.key, item])),
};
