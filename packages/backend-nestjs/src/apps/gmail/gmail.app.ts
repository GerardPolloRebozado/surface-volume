import type { AppDefinition } from '../../workflow';
import { newEmailMatchingSearch } from './triggers/new-email-matching-search.trigger';

export const gmailApp: AppDefinition = {
  id: 'gmail',
  name: 'Gmail',
  auth: {
    type: 'oauth2',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    pkce: true,
  },
  triggers: {
    [newEmailMatchingSearch.key]: newEmailMatchingSearch,
  },
  actions: {},
};
