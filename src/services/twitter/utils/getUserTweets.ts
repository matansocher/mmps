import axios from 'axios';
import { env } from 'node:process';
import { TwitterTweet, TwitterTweetsResponse } from '../types';

export async function getUserTweets(userId: string, daysBack = 1): Promise<TwitterTweet[]> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const startTimeStr = startTime.toISOString();

  const url = `https://api.twitter.com/2/users/${userId}/tweets?max_results=5&tweet.fields=created_at,public_metrics&start_time=${startTimeStr}`;

  const response = await axios.get<TwitterTweetsResponse>(url, {
    headers: {
      Authorization: `Bearer ${env.TWITTER_BEARER_TOKEN}`,
    },
  });

  return response.data.data || [];
}
