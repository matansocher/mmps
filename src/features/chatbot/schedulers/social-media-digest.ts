import type { Bot } from 'grammy';
import type { ObjectId } from 'mongodb';
import { Logger } from '@core/utils';
import { GPT_SMALL_MODEL } from '@services/openai/constants';
import { getResponse } from '@services/openai';
import { sendShortenedMessage } from '@services/telegram';
import { deletePendingPosts, getPendingPosts } from '@shared/social-follower';
import type { PendingPost, SocialPlatform } from '@shared/social-follower';
import { z } from 'zod';

const logger = new Logger('SocialMediaDigestScheduler');

const PLATFORM_LABELS = { tiktok: 'TikTok 🎵', twitter: 'X (Twitter) 🐦', youtube: 'YouTube 📺', telegram: 'Telegram 📣' } as const;
const SUMMARIZED_PLATFORMS: SocialPlatform[] = ['telegram', 'twitter']; // chatty platforms get AI summaries; the rest list each post
const MAX_FALLBACK_POSTS = 15; // raw listing cap when summarization fails

const summarySchema = z.object({
  keyPoints: z.array(z.string()).describe('The key points of what the author posted about, one bullet per distinct topic'),
});

// Sends the daily digest of everything the collectors stored since the last digest,
// then deletes exactly the posts that were sent (later arrivals roll into the next day).
export async function socialMediaDigest(bot: Bot): Promise<void> {
  const pendingPosts = await getPendingPosts();
  if (!pendingPosts.length) {
    return;
  }

  const postsByChatId = groupBy(pendingPosts, (post) => String(post.chatId));

  for (const posts of postsByChatId.values()) {
    await processDigestForChat(bot, posts[0].chatId, posts);
  }
}

async function processDigestForChat(bot: Bot, chatId: number, posts: PendingPost[]): Promise<void> {
  const sections: string[] = [];
  const postsByUser = groupBy(posts, (post) => `${post.platform}:${post.username}`);

  for (const userPosts of postsByUser.values()) {
    try {
      sections.push(await buildUserSection(userPosts));
    } catch (err) {
      logger.error(`Failed to build digest section for ${userPosts[0].platform}/@${userPosts[0].username}: ${err.message}`);
      sections.push(buildListingSection(userPosts, MAX_FALLBACK_POSTS));
    }
  }

  const message = `*Daily social media digest* 🔔\n\n${sections.join('\n\n')}`;
  try {
    await sendShortenedMessage(bot, chatId, message, { parse_mode: 'Markdown' }).catch(() => sendShortenedMessage(bot, chatId, message.replace(/[*_`[\]]/g, '')));
    await deletePendingPosts(posts.map((post) => post._id).filter(Boolean) as ObjectId[]);
  } catch (err) {
    logger.error(`Failed to send digest to chat ${chatId}, keeping posts for next digest: ${err.message}`);
  }
}

async function buildUserSection(userPosts: PendingPost[]): Promise<string> {
  if (!SUMMARIZED_PLATFORMS.includes(userPosts[0].platform)) {
    return buildListingSection(userPosts);
  }
  return buildSummarySection(userPosts);
}

function sectionHeader(userPosts: PendingPost[]): string {
  const { platform, username, displayName } = userPosts[0];
  const name = displayName ?? `@${username}`;
  return `*${PLATFORM_LABELS[platform]} - ${name}* (${userPosts.length} new)`;
}

function buildListingSection(userPosts: PendingPost[], maxPosts?: number): string {
  const shown = maxPosts ? userPosts.slice(-maxPosts) : userPosts;
  const lines = shown.map((post) => {
    const text = post.text ? (post.text.length > 200 ? `${post.text.slice(0, 200)}...` : post.text) : '(no caption)';
    return post.url ? `- ${text}\n  ${post.url}` : `- ${text}`;
  });
  const omitted = userPosts.length - shown.length;
  const omittedNote = omitted > 0 ? `\n- ...and ${omitted} more` : '';
  return `${sectionHeader(userPosts)}\n${lines.join('\n')}${omittedNote}`;
}

async function buildSummarySection(userPosts: PendingPost[]): Promise<string> {
  const texts = userPosts.map((post) => post.text).filter(Boolean);
  if (!texts.length) {
    return buildListingSection(userPosts, MAX_FALLBACK_POSTS);
  }
  const keyPointsCount = targetKeyPointsCount(texts.length);
  const instructions = [
    `You summarize a day of social media posts from a single author into their key points.`,
    `Return around ${keyPointsCount} key points (fewer if the posts cover fewer distinct topics). Each key point is one short sentence.`,
    `Write the key points in the same language the posts are written in.`,
    `Do not add opinions or information that is not in the posts.`,
  ].join('\n');
  const input = texts.map((text, i) => `Post ${i + 1}:\n${text}`).join('\n\n');
  const { result } = await getResponse({ instructions, input, schema: summarySchema, model: GPT_SMALL_MODEL, store: false });
  const bullets = result.keyPoints.map((point) => `- ${point}`).join('\n');
  return `${sectionHeader(userPosts)}\n${bullets}`;
}

// Summary length scales with volume: 4 posts -> 2 points, 100 posts -> 10 points
export function targetKeyPointsCount(postsCount: number): number {
  return Math.min(10, Math.max(2, Math.ceil(postsCount / 10)));
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const existing = grouped.get(key) || [];
    existing.push(item);
    grouped.set(key, existing);
  }
  return grouped;
}
