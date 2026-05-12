import axios from 'axios';
import { env } from 'node:process';
import { SPOTIFY_ACCOUNTS_URL } from './constants';
import { SpotifyAuthResponse } from './types';

let cachedUserAccessToken: string | null = null;
let userTokenExpirationTime: number | null = null;

export async function getSpotifyUserAccessToken(): Promise<string> {
  if (cachedUserAccessToken && userTokenExpirationTime && Date.now() < userTokenExpirationTime) {
    return cachedUserAccessToken;
  }

  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Spotify user auth not configured. Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN.');
  }

  try {
    const response = await axios.post<SpotifyAuthResponse>(
      SPOTIFY_ACCOUNTS_URL,
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
      },
    );

    cachedUserAccessToken = response.data.access_token;
    userTokenExpirationTime = Date.now() + (response.data.expires_in - 300) * 1000;

    return cachedUserAccessToken;
  } catch (error) {
    throw new Error(`Failed to refresh Spotify user token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
