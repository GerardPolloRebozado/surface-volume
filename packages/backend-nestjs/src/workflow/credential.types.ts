/** A user's authorized link to one app, holding the delegated credentials. */
export interface AppCredential {
  id: string;
  userId: string;
  appId: string;
  displayName: string;
  credentials: Record<string, unknown>;
  status: 'active' | 'expired' | 'revoked';
}
