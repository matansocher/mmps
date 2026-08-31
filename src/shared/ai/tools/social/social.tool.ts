import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { sleep } from '@core/utils';
import { fetchChannelPosts } from '@services/telegram-scraper';
import { getLatestPosts, getUserInfo, getUserVideos } from '@services/tiktok';
import { fetchLatestPosts } from '@services/twitter-scraper';
import { getChannelInfo, getChannelVideoIds, getTranscriptText, getVideoMetadata, getVideosFromRSS } from '@services/youtube';
import { createSubscription, getActiveSubscriptionsByChatId, getSubscription, removeSubscription } from '@shared/social-follower';

const chatId = MY_USER_ID;

const schema = z.object({
  platform: z.enum(['twitter', 'tiktok', 'youtube', 'telegram']).describe('The social platform to operate on: "twitter" (X), "tiktok", "youtube", or "telegram" (public channels)'),
  action: z
    .enum(['latest_posts', 'user_info', 'video_transcript', 'subscribe', 'unsubscribe', 'list'])
    .describe(
      'Action to perform: "latest_posts" fetches recent posts/videos of a user/channel; "user_info" fetches profile/channel details (tiktok profile, youtube channel info); "video_transcript" fetches a specific YouTube video transcript (youtube only); "subscribe" adds the user/channel to the daily 22:45 social media digest; "unsubscribe" removes them; "list" shows current subscriptions for the platform',
    ),
  username: z
    .string()
    .optional()
    .describe(
      'The account identifier without the @ prefix. Twitter/TikTok: username/handle (e.g., "elonmusk", "khaby.lame"). Telegram: public channel handle or t.me link (e.g., "durov"). YouTube: handle (@Fireship), channel URL, or channel ID (UC...). Required for all actions except "list" and youtube "video_transcript"',
    ),
  video: z.string().optional().describe('YouTube video URL or video ID (e.g., "https://www.youtube.com/watch?v=dQw4w9WgXcQ" or "dQw4w9WgXcQ"). Required for the youtube "video_transcript" action'),
  count: z.number().min(1).max(20).optional().describe('Number of latest posts/videos to fetch. Only used with "latest_posts". Defaults to 5. Max 20 for twitter/telegram, max 10 for tiktok/youtube'),
  includeRetweets: z.boolean().optional().describe('Whether to include retweets (default: true). Twitter "latest_posts" only'),
  includeReplies: z.boolean().optional().describe('Whether to include replies (default: true). Twitter "latest_posts" only'),
});

type SocialInput = z.infer<typeof schema>;

function cleanChannelHandle(channel: string): string {
  return channel
    .replace(/^https?:\/\/t\.me\/(s\/)?/i, '')
    .replace(/\/.*$/, '')
    .replace(/^@/, '');
}

async function twitterLatestPosts(username: string, count: number, includeRetweets?: boolean, includeReplies?: boolean) {
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

async function twitterSubscribe(username: string): Promise<string> {
  const existing = await getSubscription('twitter', username, chatId);
  if (existing) {
    return `Already subscribed to @${username} on Twitter`;
  }
  const { tweets } = await fetchLatestPosts(username, { count: 1 });
  await createSubscription({ platform: 'twitter', username, chatId, lastSeenId: tweets[0]?.id ?? null });
  return `Subscribed to @${username} on Twitter - a summary of their new posts will be included in the daily digest at 22:45`;
}

async function twitterUnsubscribe(username: string): Promise<string> {
  const existing = await getSubscription('twitter', username, chatId);
  if (!existing) {
    return `No active Twitter subscription found for @${username}`;
  }
  await removeSubscription('twitter', username, chatId);
  return `Unsubscribed from @${username} on Twitter`;
}

async function twitterList(): Promise<string> {
  const subscriptions = await getActiveSubscriptionsByChatId(chatId, 'twitter');
  if (!subscriptions.length) {
    return 'No active Twitter subscriptions';
  }
  return `Twitter subscriptions:\n${subscriptions.map((s) => `- @${s.username}`).join('\n')}`;
}

async function tiktokSubscribe(username: string): Promise<string> {
  const existing = await getSubscription('tiktok', username, chatId);
  if (existing) {
    return `Already subscribed to @${username} on TikTok`;
  }
  const { videos } = await getUserVideos(username, 1);
  await createSubscription({ platform: 'tiktok', username, chatId, lastSeenId: videos[0]?.id ?? null });
  return `Subscribed to @${username} on TikTok - their new posts will be included in the daily digest at 22:45`;
}

async function tiktokUnsubscribe(username: string): Promise<string> {
  const existing = await getSubscription('tiktok', username, chatId);
  if (!existing) {
    return `No active TikTok subscription found for @${username}`;
  }
  await removeSubscription('tiktok', username, chatId);
  return `Unsubscribed from @${username} on TikTok`;
}

async function tiktokList(): Promise<string> {
  const subscriptions = await getActiveSubscriptionsByChatId(chatId, 'tiktok');
  if (!subscriptions.length) {
    return 'No active TikTok subscriptions';
  }
  return `TikTok subscriptions:\n${subscriptions.map((s) => `- @${s.username}`).join('\n')}`;
}

async function youtubeLatestVideos(channel: string, count: number) {
  const { videoIds } = await getChannelVideoIds(channel, count);
  const videos = [];
  // sequential with a small gap - Supadata rate-limits bursts of parallel requests
  for (const videoId of videoIds) {
    videos.push(await getVideoMetadata(videoId).catch((err) => ({ id: videoId, error: `failed to fetch metadata: ${err.message}` })));
    await sleep(500);
  }
  return videos;
}

async function youtubeSubscribe(channel: string): Promise<string> {
  const info = await getChannelInfo(channel);
  const existing = await getSubscription('youtube', info.id, chatId);
  if (existing) {
    return `Already subscribed to ${info.name} on YouTube`;
  }
  const rssVideos = await getVideosFromRSS(info.id).catch(() => []);
  const publishDates = rssVideos.map((video) => new Date(video.publishedAt));
  const newestAt = publishDates.length ? new Date(Math.max(...publishDates.map((date) => date.getTime()))) : null;
  await createSubscription({ platform: 'youtube', username: info.id, displayName: info.name, chatId, lastSeenAt: newestAt });
  return `Subscribed to ${info.name} on YouTube - their new videos will be included in the daily digest at 22:45`;
}

async function youtubeUnsubscribe(channel: string): Promise<string> {
  const info = await getChannelInfo(channel);
  const existing = await getSubscription('youtube', info.id, chatId);
  if (!existing) {
    return `No active YouTube subscription found for ${info.name}`;
  }
  await removeSubscription('youtube', info.id, chatId);
  return `Unsubscribed from ${info.name} on YouTube`;
}

async function youtubeList(): Promise<string> {
  const subscriptions = await getActiveSubscriptionsByChatId(chatId, 'youtube');
  if (!subscriptions.length) {
    return 'No active YouTube subscriptions';
  }
  return `YouTube subscriptions:\n${subscriptions.map((s) => `- ${s.displayName ?? s.username}`).join('\n')}`;
}

async function youtubeVideoTranscript(video: string): Promise<string> {
  const videoUrl = video.startsWith('http') ? video : `https://www.youtube.com/watch?v=${video}`;
  const transcript = await getTranscriptText(videoUrl);
  return transcript || 'No transcript available for this video';
}

async function telegramLatestPosts(handle: string, count: number) {
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

async function telegramSubscribe(handle: string): Promise<string> {
  const existing = await getSubscription('telegram', handle, chatId);
  if (existing) {
    return `Already subscribed to @${handle} on Telegram`;
  }
  const { channel, posts } = await fetchChannelPosts(handle, 1);
  await createSubscription({ platform: 'telegram', username: handle, displayName: channel.title, chatId, lastSeenId: posts[0] ? String(posts[0].id) : null });
  return `Subscribed to ${channel.title ?? `@${handle}`} on Telegram - a summary of their new posts will be included in the daily digest at 22:45`;
}

async function telegramUnsubscribe(handle: string): Promise<string> {
  const existing = await getSubscription('telegram', handle, chatId);
  if (!existing) {
    return `No active Telegram subscription found for @${handle}`;
  }
  await removeSubscription('telegram', handle, chatId);
  return `Unsubscribed from @${handle} on Telegram`;
}

async function telegramList(): Promise<string> {
  const subscriptions = await getActiveSubscriptionsByChatId(chatId, 'telegram');
  if (!subscriptions.length) {
    return 'No active Telegram channel subscriptions';
  }
  return `Telegram channel subscriptions:\n${subscriptions.map((s) => `- ${s.displayName ?? `@${s.username}`} (@${s.username})`).join('\n')}`;
}

async function runTwitter({ action, username, count, includeRetweets, includeReplies }: SocialInput) {
  const cleanUsername = username?.replace(/^@/, '');
  if (action === 'user_info' || action === 'video_transcript') {
    return `the "${action}" action is not supported for twitter`;
  }
  if (action !== 'list' && !cleanUsername) {
    return `username is required for the "${action}" action`;
  }
  switch (action) {
    case 'latest_posts':
      return twitterLatestPosts(cleanUsername, count ?? 5, includeRetweets, includeReplies);
    case 'subscribe':
      return twitterSubscribe(cleanUsername);
    case 'unsubscribe':
      return twitterUnsubscribe(cleanUsername);
    case 'list':
      return twitterList();
  }
}

async function runTiktok({ action, username, count }: SocialInput) {
  const cleanUsername = username?.replace(/^@/, '');
  if (action === 'video_transcript') {
    return 'the "video_transcript" action is not supported for tiktok';
  }
  if (action !== 'list' && !cleanUsername) {
    return `username is required for the "${action}" action`;
  }
  switch (action) {
    case 'latest_posts':
      return getLatestPosts(cleanUsername, count ?? 5);
    case 'user_info':
      return getUserInfo(cleanUsername);
    case 'subscribe':
      return tiktokSubscribe(cleanUsername);
    case 'unsubscribe':
      return tiktokUnsubscribe(cleanUsername);
    case 'list':
      return tiktokList();
  }
}

async function runYoutube({ action, username, video, count }: SocialInput) {
  if (action === 'video_transcript') {
    return video ? youtubeVideoTranscript(video) : 'video is required for the "video_transcript" action';
  }
  if (action !== 'list' && !username) {
    return `username (channel) is required for the "${action}" action`;
  }
  switch (action) {
    case 'latest_posts':
      return youtubeLatestVideos(username, count ?? 5);
    case 'user_info':
      return getChannelInfo(username);
    case 'subscribe':
      return youtubeSubscribe(username);
    case 'unsubscribe':
      return youtubeUnsubscribe(username);
    case 'list':
      return youtubeList();
  }
}

async function runTelegram({ action, username, count }: SocialInput) {
  if (action === 'user_info' || action === 'video_transcript') {
    return `the "${action}" action is not supported for telegram`;
  }
  const handle = username ? cleanChannelHandle(username) : undefined;
  if (action !== 'list' && !handle) {
    return `username (channel) is required for the "${action}" action`;
  }
  switch (action) {
    case 'latest_posts':
      return telegramLatestPosts(handle, count ?? 5);
    case 'subscribe':
      return telegramSubscribe(handle);
    case 'unsubscribe':
      return telegramUnsubscribe(handle);
    case 'list':
      return telegramList();
  }
}

async function runner(input: SocialInput) {
  switch (input.platform) {
    case 'twitter':
      return runTwitter(input);
    case 'tiktok':
      return runTiktok(input);
    case 'youtube':
      return runYoutube(input);
    case 'telegram':
      return runTelegram(input);
  }
}

export const socialTool = tool(runner, {
  name: 'social',
  description:
    'Interact with social accounts across four platforms (twitter, tiktok, youtube, telegram) via a "platform" discriminator. Fetch latest posts/videos ("latest_posts"), profile/channel info ("user_info" for tiktok/youtube), a YouTube video transcript ("video_transcript", youtube only), or manage subscriptions for the daily 22:45 social media digest ("subscribe"/"unsubscribe"/"list"). Twitter/Telegram new posts are summarized into key points in the digest; TikTok/YouTube are listed. Accepts handles, usernames, channel URLs/IDs, or t.me links as appropriate per platform.',
  schema,
});
