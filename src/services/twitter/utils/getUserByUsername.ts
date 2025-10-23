import axios from 'axios';
import { env } from 'node:process';
import { TwitterUser, TwitterUserResponse } from '../types';

export async function getUserByUsername(username: string): Promise<TwitterUser | null> {
  const cleanUsername = username.replace('@', '');
  const url = `https://api.twitter.com/2/users/by/username/${cleanUsername}?user.fields=description,profile_image_url,verified,public_metrics`;

  const response = await axios.get<TwitterUserResponse>(url, {
    headers: {
      Authorization: `Bearer ${env.TWITTER_BEARER_TOKEN}`,
    },
  });

  return response.data.data || null;
}
