import { createRemoteJWKSet, jwtVerify } from 'jose';
import crypto from 'node:crypto';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { MMPS_BASE_URL } from '@core/config';
import { upsertAuthUser, savePendingAuth, consumePendingAuth, createSession, getValidSession, deleteSession, getAuthUserByTelegramId } from './mongo';
import type { AuthApp, AuthUser, TelegramIdTokenPayload } from './types';

const logger = new Logger('AuthService');

const TELEGRAM_AUTH_URL = 'https://oauth.telegram.org/auth';
const TELEGRAM_TOKEN_URL = 'https://oauth.telegram.org/token';
const TELEGRAM_JWKS_URL = 'https://oauth.telegram.org/.well-known/jwks.json';

const JWKS = createRemoteJWKSet(new URL(TELEGRAM_JWKS_URL));

function getClientId(): string {
  return env.TELEGRAM_LOGIN_CLIENT_ID;
}

function getClientSecret(): string {
  return env.TELEGRAM_LOGIN_CLIENT_SECRET;
}

function getRedirectUri(): string {
  return `${MMPS_BASE_URL}/api/auth/telegram/callback`;
}

// --- PKCE Helpers ---

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// --- Public API ---

export async function startAuthFlow(app: AuthApp): Promise<string> {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  await savePendingAuth(state, codeVerifier, app);

  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'openid profile phone',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${TELEGRAM_AUTH_URL}?${params.toString()}`;
}

export async function handleCallback(code: string, state: string): Promise<{ token: string; user: AuthUser }> {
  const pending = await consumePendingAuth(state);
  if (!pending) {
    throw new Error('Invalid or expired auth state');
  }

  // Exchange code for tokens
  const credentials = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64');

  const tokenResponse = await fetch(TELEGRAM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
      code_verifier: pending.codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    logger.error(`Token exchange failed: ${tokenResponse.status} ${errorBody}`);
    throw new Error('Token exchange failed');
  }

  const tokenData = (await tokenResponse.json()) as { id_token: string; access_token: string };
  const idToken = tokenData.id_token;

  // Validate the id_token
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: 'https://oauth.telegram.org',
    audience: getClientId(),
  });

  const claims = payload as unknown as TelegramIdTokenPayload;

  // Parse name into first/last
  const nameParts = (claims.name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Upsert user
  const user = await upsertAuthUser({
    telegramUserId: claims.id,
    username: claims.preferred_username || '',
    firstName,
    lastName,
    photoUrl: claims.picture,
    phoneNumber: claims.phone_number,
  });

  // Create session — app comes from the pending auth record
  const sessionToken = crypto.randomBytes(32).toString('hex');
  await createSession(claims.id, sessionToken, pending.app);

  logger.log(`User authenticated: ${claims.id} (@${claims.preferred_username}) for app: ${pending.app}`);

  return { token: sessionToken, user };
}

export async function validateToken(token: string): Promise<AuthUser | null> {
  const session = await getValidSession(token);
  if (!session) return null;

  return getAuthUserByTelegramId(session.telegramUserId);
}

export async function logout(token: string): Promise<void> {
  await deleteSession(token);
}
