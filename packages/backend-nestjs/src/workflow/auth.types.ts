import type { AppCredential } from './credential.types';
import type { AuthContext } from './context.types';
import type { InputField } from './fields.types';

export type AuthDefinition =
  | { type: 'none' }
  | { type: 'api_key'; fields: InputField[] }
  | { type: 'basic' }
  | {
      type: 'oauth2';
      authorizeUrl: string;
      tokenUrl: string;
      scopes: string[];
      pkce?: boolean;
      refresh?: (credential: AppCredential) => Promise<OAuthTokens>;
    }
  | {
      type: 'custom';
      fields: InputField[];
      test: (ctx: AuthContext) => Promise<void>;
    };

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface VerifiedCredential {
  externalAccountId: string;
  displayName: string;
  scopes?: string[];
}
