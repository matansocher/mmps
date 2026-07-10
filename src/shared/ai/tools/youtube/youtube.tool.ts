import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { sleep } from '@core/utils';
import { getChannelInfo, getChannelVideoIds, getVideoMetadata, getVideosFromRSS } from '@services/youtube';
import { createSubscription, getActiveSubscriptionsByChatId, getSubscription, removeSubscription } from '@shared/social-follower';

const chatId = MY_USER_ID;

const schema = z.object({
  action: z
    .enum(['latest_videos', 'channel_info', 'subscribe', 'unsubscribe', 'list'])
    .describe(
      'Action to perform: "latest_videos" fetches the latest videos of a channel, "channel_info" fetches channel details, "subscribe" adds hourly new-video notifications for a channel, "unsubscribe" removes them, "list" shows current subscriptions',
    ),
  channel: z.string().optional().describe('YouTube channel identifier - handle (@Fireship), channel URL, or channel ID (UC...). Required for all actions except "list"'),
  count: z.number().min(1).max(10).optional().describe('Number of latest videos to fetch (default: 5, max: 10). Only used with "latest_videos"'),
});

async function handleLatestVideos(channel: string, count: number) {
  const { videoIds } = await getChannelVideoIds(channel, count);
  const videos = [];
  // sequential with a small gap - Supadata rate-limits bursts of parallel requests
  for (const videoId of videoIds) {
    videos.push(await getVideoMetadata(videoId).catch((err) => ({ id: videoId, error: `failed to fetch metadata: ${err.message}` })));
    await sleep(500);
  }
  return videos;
}

async function handleSubscribe(channel: string): Promise<string> {
  const info = await getChannelInfo(channel);
  const existing = await getSubscription('youtube', info.id, chatId);
  if (existing) {
    return `Already subscribed to ${info.name} on YouTube`;
  }
  const rssVideos = await getVideosFromRSS(info.id).catch(() => []);
  const publishDates = rssVideos.map((video) => new Date(video.publishedAt));
  const newestAt = publishDates.length ? new Date(Math.max(...publishDates.map((date) => date.getTime()))) : null;
  await createSubscription({ platform: 'youtube', username: info.id, displayName: info.name, chatId, lastSeenAt: newestAt });
  return `Subscribed to ${info.name} on YouTube - you will get a notification when they upload a new video (checked hourly between 11:00-23:00)`;
}

async function handleUnsubscribe(channel: string): Promise<string> {
  const info = await getChannelInfo(channel);
  const existing = await getSubscription('youtube', info.id, chatId);
  if (!existing) {
    return `No active YouTube subscription found for ${info.name}`;
  }
  await removeSubscription('youtube', info.id, chatId);
  return `Unsubscribed from ${info.name} on YouTube`;
}

async function handleList(): Promise<string> {
  const subscriptions = await getActiveSubscriptionsByChatId(chatId, 'youtube');
  if (!subscriptions.length) {
    return 'No active YouTube subscriptions';
  }
  return `YouTube subscriptions:\n${subscriptions.map((s) => `- ${s.displayName ?? s.username}`).join('\n')}`;
}

async function runner({ action, channel, count }: z.infer<typeof schema>) {
  if (action !== 'list' && !channel) {
    return `channel is required for the "${action}" action`;
  }
  switch (action) {
    case 'latest_videos':
      return handleLatestVideos(channel, count ?? 5);
    case 'channel_info':
      return getChannelInfo(channel);
    case 'subscribe':
      return handleSubscribe(channel);
    case 'unsubscribe':
      return handleUnsubscribe(channel);
    case 'list':
      return handleList();
  }
}

export const youtubeTool = tool(runner, {
  name: 'youtube',
  description:
    'Get the latest YouTube videos of a channel (with title, stats, and duration), channel info, or manage hourly new-video notifications: subscribe/unsubscribe to a channel, or list current subscriptions. Accepts handles (@Fireship), channel URLs, or channel IDs.',
  schema,
});
