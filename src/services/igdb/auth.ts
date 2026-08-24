import { env } from 'node:process';
import { TOKEN_SAFETY_WINDOW_MS, TWITCH_TOKEN_URL } from './constants';
import type { TwitchTokenResponse } from './types';

let cachedToken: { token: string; expiresAt: number } | null = null;

export function validateIgdbCredentials(): void {
  if (!env.IGDB_CLIENT_ID || !env.IGDB_CLIENT_SECRET) {
    throw new Error('IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are not configured. Register an app at https://dev.twitch.tv/console/apps');
  }
}

export async function getAccessToken(): Promise<string> {
  validateIgdbCredentials();

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set('client_id', env.IGDB_CLIENT_ID);
  url.searchParams.set('client_secret', env.IGDB_CLIENT_SECRET);
  url.searchParams.set('grant_type', 'client_credentials');

  const response = await fetch(url.toString(), { method: 'POST' });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Twitch token request failed: HTTP ${response.status} - ${body || '(empty body)'}`);
  }

  const data = JSON.parse(body) as TwitchTokenResponse;
  if (!data.access_token) {
    throw new Error('Twitch token response did not include an access token');
  }

  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_SAFETY_WINDOW_MS };
  return cachedToken.token;
}

export function getIgdbHeaders(token: string): Record<string, string> {
  return {
    'Client-ID': env.IGDB_CLIENT_ID,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'text/plain',
  };
}
