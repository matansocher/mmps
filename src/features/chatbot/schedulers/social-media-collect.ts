import { getErrorMessage, Logger, sleep } from '@core/utils';
import { fetchChannelPosts as fetchTelegramChannelPosts } from '@services/telegram-scraper';
import { getUserSecUid, getUserVideosBySecUid } from '@services/tiktok';
import { fetchLatestPosts as fetchTwitterLatestPosts } from '@services/twitter-scraper';
import { getVideosFromRSS } from '@services/youtube';
import { createPendingPosts, getSubscriptionsGroupedByChatId, updateLastSeen, updateSecUid } from '@shared/social-follower';
import type { SocialPlatform, SocialSubscription, UpdateLastSeenData } from '@shared/social-follower';

const logger = new Logger('chatbot:scheduler:social-media-collect');

const SLEEP_BETWEEN_USERS_MS = 5000; // be gentle with anonymous scraping endpoints

type NewPost = {
  readonly postId: string | null;
  readonly text: string | null;
  readonly url: string | null;
  readonly postedAt: Date;
};

type CollectResult = {
  readonly newPosts: NewPost[];
  readonly lastSeen: UpdateLastSeenData | null;
};

// Silently collects new posts into the PendingPost collection; the daily digest
// scheduler (social-media-digest.ts) sends them to the user at 22:45.
export async function socialMediaCollect(platforms: SocialPlatform[]): Promise<void> {
  const subscriptionsByChatId = await getSubscriptionsGroupedByChatId();

  for (const [, subscriptions] of subscriptionsByChatId) {
    const relevantSubscriptions = subscriptions.filter((subscription) => platforms.includes(subscription.platform));
    for (const subscription of relevantSubscriptions) {
      await collectSubscription(subscription);
      await sleep(SLEEP_BETWEEN_USERS_MS);
    }
  }
}

async function collectSubscription(subscription: SocialSubscription): Promise<void> {
  const { platform, username, displayName, chatId } = subscription;
  try {
    const { newPosts, lastSeen } = await getNewPosts(subscription);
    // Persist pending posts before advancing lastSeen — a crash in between re-collects
    // instead of losing posts (createPendingPosts dedupes by postId)
    await createPendingPosts(newPosts.map((post) => ({ platform, username, displayName, chatId, ...post })));
    if (lastSeen) {
      await updateLastSeen(platform, username, chatId, lastSeen);
    }
    if (newPosts.length > 0) {
      logger.log(`Collected ${newPosts.length} new posts from ${platform}/@${username}`);
    }
  } catch (err) {
    logger.error(`Failed to check ${platform}/@${username}: ${getErrorMessage(err)}`);
  }
}

async function getNewPosts(subscription: SocialSubscription): Promise<CollectResult> {
  switch (subscription.platform) {
    case 'twitter':
      return getNewTwitterPosts(subscription);
    case 'tiktok':
      return getNewTikTokPosts(subscription);
    case 'youtube':
      return getNewYouTubeVideos(subscription);
    case 'telegram':
      return getNewTelegramPosts(subscription);
  }
}

async function getNewTwitterPosts({ username, lastSeenId }: SocialSubscription): Promise<CollectResult> {
  const { tweets } = await fetchTwitterLatestPosts(username, { count: 5 });
  if (!tweets.length) {
    return { newPosts: [], lastSeen: null };
  }
  const newTweets = lastSeenId ? tweets.filter((tweet) => BigInt(tweet.id) > BigInt(lastSeenId)) : tweets;
  const newestId = tweets.reduce((max, tweet) => (BigInt(tweet.id) > BigInt(max) ? tweet.id : max), tweets[0].id);
  return {
    newPosts: newTweets.map((tweet) => ({ postId: tweet.id, text: tweet.text, url: tweet.url, postedAt: new Date(tweet.createdAt) })),
    lastSeen: { lastSeenId: newestId },
  };
}

async function getNewTikTokPosts({ username, chatId, lastSeenId, secUid }: SocialSubscription): Promise<CollectResult> {
  // secUid is a stable per-user id; resolve it once, then cache it on the subscription so a
  // flaky /api/user/info response can't break collection for a user we've already resolved.
  let resolvedSecUid = secUid;
  if (!resolvedSecUid) {
    resolvedSecUid = await getUserSecUid(username);
    await updateSecUid(username, chatId, resolvedSecUid);
  }

  const { videos } = await getUserVideosBySecUid(resolvedSecUid, 5);
  if (!videos.length) {
    return { newPosts: [], lastSeen: null };
  }
  // TikTok video ids are chronological snowflakes; BigInt comparison also neutralizes pinned videos
  const newVideos = lastSeenId ? videos.filter((video) => BigInt(video.id) > BigInt(lastSeenId)) : [...videos];
  const newestId = videos.reduce((max, video) => (BigInt(video.id) > BigInt(max) ? video.id : max), videos[0].id);
  return {
    newPosts: newVideos.map((video) => ({ postId: video.id, text: video.description, url: video.url, postedAt: new Date(video.createdAt) })),
    lastSeen: { lastSeenId: newestId },
  };
}

async function getNewYouTubeVideos({ username: channelId, lastSeenAt }: SocialSubscription): Promise<CollectResult> {
  const videos = await getVideosFromRSS(channelId); // free official RSS feed, no API quota
  if (!videos.length) {
    return { newPosts: [], lastSeen: null };
  }
  const withDates = videos.map((video) => ({ ...video, publishedDate: new Date(video.publishedAt) }));
  const newVideos = lastSeenAt ? withDates.filter((video) => video.publishedDate > lastSeenAt) : [];
  const newestAt = withDates.reduce((max, video) => (video.publishedDate > max ? video.publishedDate : max), withDates[0].publishedDate);
  return {
    newPosts: newVideos.map((video) => ({ postId: video.id, text: video.title, url: video.url, postedAt: video.publishedDate })),
    lastSeen: { lastSeenAt: newestAt },
  };
}

async function getNewTelegramPosts({ username, lastSeenId }: SocialSubscription): Promise<CollectResult> {
  const { posts } = await fetchTelegramChannelPosts(username, 20); // free t.me web preview (~20 posts per page), no auth
  if (!posts.length) {
    return { newPosts: [], lastSeen: null };
  }
  // Telegram post ids are sequential per channel
  const newPosts = lastSeenId ? posts.filter((post) => post.id > Number(lastSeenId)) : [];
  const newestId = posts.reduce((max, post) => (post.id > max ? post.id : max), posts[0].id);
  return {
    newPosts: newPosts.map((post) => ({ postId: String(post.id), text: post.text, url: post.url, postedAt: post.publishedAt ? new Date(post.publishedAt) : new Date() })),
    lastSeen: { lastSeenId: String(newestId) },
  };
}
