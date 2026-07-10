import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { getLatestPosts, getUserInfo, getUserVideos } from '@services/tiktok';
import { createSubscription, getActiveSubscriptionsByChatId, getSubscription, removeSubscription } from '@shared/social-follower';

const chatId = MY_USER_ID;

const schema = z.object({
  action: z
    .enum(['latest_posts', 'user_info', 'subscribe', 'unsubscribe', 'list'])
    .describe(
      'Action to perform: "latest_posts" fetches the latest posts of a user, "user_info" fetches the user profile details, "subscribe" adds hourly new-post notifications for a user, "unsubscribe" removes them, "list" shows current subscriptions',
    ),
  username: z.string().optional().describe('TikTok username without the @ prefix (e.g., "khaby.lame"). Required for all actions except "list"'),
  count: z.number().min(1).max(10).optional().describe('Number of latest posts to fetch (default: 5, max: 10). Only used with "latest_posts"'),
});

async function handleSubscribe(username: string): Promise<string> {
  const existing = await getSubscription('tiktok', username, chatId);
  if (existing) {
    return `Already subscribed to @${username} on TikTok`;
  }
  const { videos } = await getUserVideos(username, 1);
  await createSubscription({ platform: 'tiktok', username, chatId, lastSeenId: videos[0]?.id ?? null });
  return `Subscribed to @${username} on TikTok - you will get a notification when they post something new (checked hourly between 11:00-23:00)`;
}

async function handleUnsubscribe(username: string): Promise<string> {
  const existing = await getSubscription('tiktok', username, chatId);
  if (!existing) {
    return `No active TikTok subscription found for @${username}`;
  }
  await removeSubscription('tiktok', username, chatId);
  return `Unsubscribed from @${username} on TikTok`;
}

async function handleList(): Promise<string> {
  const subscriptions = await getActiveSubscriptionsByChatId(chatId, 'tiktok');
  if (!subscriptions.length) {
    return 'No active TikTok subscriptions';
  }
  return `TikTok subscriptions:\n${subscriptions.map((s) => `- @${s.username}`).join('\n')}`;
}

async function runner({ action, username, count }: z.infer<typeof schema>) {
  const cleanUsername = username?.replace(/^@/, '');
  if (action !== 'list' && !cleanUsername) {
    return `username is required for the "${action}" action`;
  }
  switch (action) {
    case 'latest_posts':
      return getLatestPosts(cleanUsername, count ?? 5);
    case 'user_info':
      return getUserInfo(cleanUsername);
    case 'subscribe':
      return handleSubscribe(cleanUsername);
    case 'unsubscribe':
      return handleUnsubscribe(cleanUsername);
    case 'list':
      return handleList();
  }
}

export const tiktokTool = tool(runner, {
  name: 'tiktok',
  description:
    'Get the latest TikTok posts of a user (with video download link and transcript when available), a TikTok user profile info, or manage hourly new-post notifications: subscribe/unsubscribe to a user, or list current subscriptions',
  schema,
});
