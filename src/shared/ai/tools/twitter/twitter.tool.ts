import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { fetchLatestPosts } from '@services/twitter-scraper';
import { createSubscription, getActiveSubscriptionsByChatId, getSubscription, removeSubscription } from '@shared/social-follower';

const chatId = MY_USER_ID;

const schema = z.object({
  action: z
    .enum(['latest_posts', 'subscribe', 'unsubscribe', 'list'])
    .describe('Action to perform: "latest_posts" fetches recent tweets, "subscribe" adds a user to the daily 22:45 social media digest, "unsubscribe" removes them, "list" shows current subscriptions'),
  username: z.string().optional().describe('The X (Twitter) username/handle, without the @ prefix (e.g., "elonmusk", "nasa"). Required for all actions except "list"'),
  count: z.number().min(1).max(20).optional().describe('Number of latest posts to fetch (default: 5, max: 20). Only used with "latest_posts"'),
  includeRetweets: z.boolean().optional().describe('Whether to include retweets (default: true). Only used with "latest_posts"'),
  includeReplies: z.boolean().optional().describe('Whether to include replies (default: true). Only used with "latest_posts"'),
});

async function handleLatestPosts(username: string, count: number, includeRetweets?: boolean, includeReplies?: boolean) {
  const { user, tweets } = await fetchLatestPosts(username, { count, includeRetweets, includeReplies });
  return {
    user,
    posts: tweets.map((t) => ({
      text: t.text,
      createdAt: t.createdAt,
      url: t.url,
      isRetweet: t.isRetweet,
      isReply: t.isReply,
      ...(t.metrics ? { metrics: t.metrics } : {}),
    })),
  };
}

async function handleSubscribe(username: string): Promise<string> {
  const existing = await getSubscription('twitter', username, chatId);
  if (existing) {
    return `Already subscribed to @${username} on Twitter`;
  }
  const { tweets } = await fetchLatestPosts(username, { count: 1 });
  await createSubscription({ platform: 'twitter', username, chatId, lastSeenId: tweets[0]?.id ?? null });
  return `Subscribed to @${username} on Twitter - a summary of their new posts will be included in the daily digest at 22:45`;
}

async function handleUnsubscribe(username: string): Promise<string> {
  const existing = await getSubscription('twitter', username, chatId);
  if (!existing) {
    return `No active Twitter subscription found for @${username}`;
  }
  await removeSubscription('twitter', username, chatId);
  return `Unsubscribed from @${username} on Twitter`;
}

async function handleList(): Promise<string> {
  const subscriptions = await getActiveSubscriptionsByChatId(chatId, 'twitter');
  if (!subscriptions.length) {
    return 'No active Twitter subscriptions';
  }
  return `Twitter subscriptions:\n${subscriptions.map((s) => `- @${s.username}`).join('\n')}`;
}

async function runner({ action, username, count, includeRetweets, includeReplies }: z.infer<typeof schema>) {
  const cleanUsername = username?.replace(/^@/, '');
  if (action !== 'list' && !cleanUsername) {
    return `username is required for the "${action}" action`;
  }
  switch (action) {
    case 'latest_posts':
      return handleLatestPosts(cleanUsername, count ?? 5, includeRetweets, includeReplies);
    case 'subscribe':
      return handleSubscribe(cleanUsername);
    case 'unsubscribe':
      return handleUnsubscribe(cleanUsername);
    case 'list':
      return handleList();
  }
}

export const twitterTool = tool(runner, {
  name: 'twitter',
  description:
    'Fetch the latest posts (tweets) of any public X (Twitter) user by username, or manage subscriptions for the daily 22:45 social media digest (new posts are summarized per user): subscribe/unsubscribe to a user, or list current subscriptions. Returns post text, date, link, and engagement metrics when available.',
  schema,
});
