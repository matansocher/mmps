import { OAuth2Client } from 'google-auth-library';
import { env } from 'node:process';
import { isProd } from '@core/config';
import { Logger } from '@core/utils';

const logger = new Logger('FootballManagerGoogleAuth');

export type VerifiedGoogleUser = {
  readonly sub: string;
  readonly email: string;
  readonly name: string;
  readonly picture?: string;
};

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client | null {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) return null;
  if (!client) client = new OAuth2Client(clientId);
  return client;
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_OAUTH_CLIENT_ID);
}

// Dev-mode login is allowed in any non-production environment so the game can be
// played locally without Google sign-in, even when Google credentials are configured.
// Production stays Google-only (this returns false there).
export function isDevLoginAllowed(): boolean {
  return !isProd;
}

// Verifies a Google Identity Services ID token (JWT) and returns the profile.
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser | null> {
  const oauthClient = getClient();
  if (!oauthClient) return null;
  try {
    const ticket = await oauthClient.verifyIdToken({ idToken, audience: env.GOOGLE_OAUTH_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) return null;
    return { sub: payload.sub, email: payload.email, name: payload.name ?? payload.email, picture: payload.picture };
  } catch (err) {
    logger.error(`Failed to verify Google ID token: ${err}`);
    return null;
  }
}
