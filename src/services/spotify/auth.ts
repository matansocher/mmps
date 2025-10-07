import axios from 'axios';
import { env } from 'node:process';
import { SPOTIFY_ACCOUNTS_URL } from './constants';
import { SpotifyAuthResponse } from './types';

let cachedAccessToken: string | null = null;
let tokenExpirationTime: number | null = null;

export async function getSpotifyAccessToken(): Promise<string> {
  if (cachedAccessToken && tokenExpirationTime && Date.now() < tokenExpirationTime) {
    return cachedAccessToken;
  }

  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify API credentials not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.');
  }

  try {
    const response = await axios.post<SpotifyAuthResponse>(SPOTIFY_ACCOUNTS_URL, new URLSearchParams({ grant_type: 'client_credentials' }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
    });

    cachedAccessToken = response.data.access_token;
    tokenExpirationTime = Date.now() + (response.data.expires_in - 300) * 1000;

    return cachedAccessToken;
  } catch (error) {
    throw new Error(`Failed to authenticate with Spotify: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
