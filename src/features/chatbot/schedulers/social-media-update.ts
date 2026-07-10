import type { Bot } from 'grammy';
import { Logger, sleep } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getUserVideos } from '@services/tiktok';
import { fetchLatestPosts as fetchTwitterLatestPosts } from '@services/twitter-scraper';
import { getSubscriptionsGroupedByChatId, updateLastSeen } from '@shared/social-follower';
import type { SocialSubscription } from '@shared/social-follower';

const logger = new Logger('SocialMediaUpdateScheduler');

const PLATFORM_LABELS = { tiktok: 'TikTok 🎵', twitter: 'X (Twitter) 🐦' } as const;
const SLEEP_BETWEEN_USERS_MS = 5000; // be gentle with anonymous scraping endpoints

type NewPost = {
  readonly text: string;
  readonly url: string | null;
  readonly createdAt: Date;
};

export async function socialMediaUpdate(bot: Bot): Promise<void> {
  const subscriptionsByChatId = await getSubscriptionsGroupedByChatId();

  if (subscriptionsByChatId.size === 0) {
    return;
  }

  for (const [chatId, subscriptions] of subscriptionsByChatId) {
    await processSubscriptionsForChat(bot, chatId, subscriptions);
  }
}

async function processSubscriptionsForChat(bot: Bot, chatId: number, subscriptions: SocialSubscription[]): Promise<void> {
  const sections: string[] = [];

  for (const subscription of subscriptions) {
    try {
      const newPosts = await getNewPosts(subscription);
      if (newPosts.length > 0) {
        sections.push(formatSubscriptionSection(subscription, newPosts));
      }
    } catch (err) {
      logger.error(`Failed to check ${subscription.platform}/@${subscription.username}: ${err.message}`);
    }
    await sleep(SLEEP_BETWEEN_USERS_MS);
  }

  if (sections.length === 0) {
    return;
  }

  const message = `*New social media posts* 🔔\n\n${sections.join('\n\n')}`;
  await sendShortenedMessage(bot, chatId, message, { parse_mode: 'Markdown' }).catch(() => {
    sendShortenedMessage(bot, chatId, message.replace(/[*_`[\]]/g, ''));
  });
}

async function getNewPosts(subscription: SocialSubscription): Promise<NewPost[]> {
  switch (subscription.platform) {
    case 'twitter':
      return getNewTwitterPosts(subscription);
    case 'tiktok':
      return getNewTikTokPosts(subscription);
  }
}

async function getNewTwitterPosts({ username, chatId, lastSeenId }: SocialSubscription): Promise<NewPost[]> {
  const { tweets } = await fetchTwitterLatestPosts(username, { count: 5 });
  if (!tweets.length) {
    return [];
  }
  const newTweets = lastSeenId ? tweets.filter((tweet) => BigInt(tweet.id) > BigInt(lastSeenId)) : tweets;
  const newestId = tweets.reduce((max, tweet) => (BigInt(tweet.id) > BigInt(max) ? tweet.id : max), tweets[0].id);
  await updateLastSeen('twitter', username, chatId, { lastSeenId: newestId });
  return newTweets.map((tweet) => ({ text: tweet.text, url: tweet.url, createdAt: new Date(tweet.createdAt) }));
}

async function getNewTikTokPosts({ username, chatId, lastSeenId }: SocialSubscription): Promise<NewPost[]> {
  const { videos } = await getUserVideos(username, 5);
  if (!videos.length) {
    return [];
  }
  // TikTok video ids are chronological snowflakes; BigInt comparison also neutralizes pinned videos
  const newVideos = lastSeenId ? videos.filter((video) => BigInt(video.id) > BigInt(lastSeenId)) : [...videos];
  const newestId = videos.reduce((max, video) => (BigInt(video.id) > BigInt(max) ? video.id : max), videos[0].id);
  await updateLastSeen('tiktok', username, chatId, { lastSeenId: newestId });
  return newVideos.map((video) => ({ text: video.description, url: video.url, createdAt: new Date(video.createdAt) }));
}

function formatSubscriptionSection(subscription: SocialSubscription, newPosts: NewPost[]): string {
  const header = `*${PLATFORM_LABELS[subscription.platform]} - @${subscription.username}* (${newPosts.length} new)`;
  const lines = newPosts.map((post) => {
    const text = post.text ? (post.text.length > 200 ? `${post.text.slice(0, 200)}...` : post.text) : '(no caption)';
    return post.url ? `- ${text}\n  ${post.url}` : `- ${text}`;
  });
  return `${header}\n${lines.join('\n')}`;
}
