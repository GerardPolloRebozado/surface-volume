import type { AppDefinition } from '../../workflow';
import { GMAIL_SEND_SCOPE, sendEmailAction } from './actions/send-email.action';
import { newEmailMatchingSearch } from './triggers/new-email-matching-search.trigger';
import { newStarredEmail } from './triggers/new-starred-email.trigger';

export const gmailApp: AppDefinition = {
  id: 'gmail',
  name: 'Gmail',
  auth: {
    type: 'oauth2',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      GMAIL_SEND_SCOPE,
    ],
    pkce: true,
    fields: [
      {
        key: 'accessToken',
        label: 'Access token',
        type: 'string',
        required: true,
        secret: true,
        helpText: 'Google OAuth access token. It needs the gmail.send scope.',
      },
    ],
  },
  triggers: {
    [newEmailMatchingSearch.key]: newEmailMatchingSearch,
    [newStarredEmail.key]: newStarredEmail,
  },
  actions: {
    [sendEmailAction.key]: sendEmailAction,
  },
};
