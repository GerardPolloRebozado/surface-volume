import type { AppDefinition } from '../../workflow';
import { newFileInFolder } from './triggers/new-file-in-folder.trigger';

export const driveApp: AppDefinition = {
  id: 'drive',
  name: 'Google Drive',
  auth: {
    type: 'oauth2',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    pkce: true,
  },
  triggers: {
    [newFileInFolder.key]: newFileInFolder,
  },
  actions: {},
};
