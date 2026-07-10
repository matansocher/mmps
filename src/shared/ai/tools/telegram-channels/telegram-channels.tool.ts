import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { fetchChannelPosts } from '@services/telegram-scraper';
import { createSubscription, getActiveSubscriptionsByChatId, getSubscription, removeSubscription } from '@shared/social-follower';

const chatId = MY_USER_ID;

const schema = z.object({
  action: z
    .enum(['latest_posts', 'subscribe', 'unsubscribe', 'list'])
    .describe('Action to perform: "latest_posts" fetches recent posts of a public channel, "subscribe" adds new-post notifications for a channel (checked hourly between 11:30-23:30), "unsubscribe" removes them, "list" shows current subscriptions'),
  channel: z.string().optional().describe('The public Telegram channel handle, without the @ prefix (e.g., "durov", "geektimecoil"). Also accepts t.me links. Required for all actions except "list"'),
  count: z.number().min(1).max(20).optional().describe('Number of latest posts to fetch (default: 5, max: 20). Only used with "latest_posts"'),
});

function cleanChannelHandle(channel: string): string {
  return channel
    .replace(/^https?:\/\/t\.me\/(s\/)?/i, '')
    .replace(/\/.*$/, '')
    .replace(/^@/, '');
}

async function handleLatestPosts(handle: string, count: number) {
  const { channel, posts } = await fetchChannelPosts(handle, count);
  return {
    channel,
    posts: posts.map((post) => ({
      text: post.text,
      publishedAt: post.publishedAt,
      url: post.url,
      views: post.views,
      ...(post.hasPhoto ? { hasPhoto: true } : {}),
      ...(post.hasVideo ? { hasVideo: true } : {}),
    })),
  };
}

async function handleSubscribe(handle: string): Promise<string> {
  const existing = await getSubscription('telegram', handle, chatId);
  if (existing) {
    return `Already subscribed to @${handle} on Telegram`;
  }
  const { channel, posts } = await fetchChannelPosts(handle, 1);
  await createSubscription({ platform: 'telegram', username: handle, displayName: channel.title, chatId, lastSeenId: posts[0] ? String(posts[0].id) : null });
  return `Subscribed to ${channel.title ?? `@${handle}`} on Telegram - you will get a notification when they post something new (checked hourly between 11:30-23:30)`;
}

async function handleUnsubscribe(handle: string): Promise<string> {
  const existing = await getSubscription('telegram', handle, chatId);
  if (!existing) {
    return `No active Telegram subscription found for @${handle}`;
  }
  await removeSubscription('telegram', handle, chatId);
  return `Unsubscribed from @${handle} on Telegram`;
}

async function handleList(): Promise<string> {
  const subscriptions = await getActiveSubscriptionsByChatId(chatId, 'telegram');
  if (!subscriptions.length) {
    return 'No active Telegram channel subscriptions';
  }
  return `Telegram channel subscriptions:\n${subscriptions.map((s) => `- ${s.displayName ?? `@${s.username}`} (@${s.username})`).join('\n')}`;
}

async function runner({ action, channel, count }: z.infer<typeof schema>) {
  const handle = channel ? cleanChannelHandle(channel) : undefined;
  if (action !== 'list' && !handle) {
    return `channel is required for the "${action}" action`;
  }
  switch (action) {
    case 'latest_posts':
      return handleLatestPosts(handle, count ?? 5);
    case 'subscribe':
      return handleSubscribe(handle);
    case 'unsubscribe':
      return handleUnsubscribe(handle);
    case 'list':
      return handleList();
  }
}

export const telegramChannelsTool = tool(runner, {
  name: 'telegram_channels',
  description:
    'Fetch the latest posts of any public Telegram channel by handle (via the t.me web preview, public channels only), or manage new-post notifications (checked hourly between 11:30-23:30): subscribe/unsubscribe to a channel, or list current subscriptions. Returns post text, date, link, and view count.',
  schema,
});
