import type { Bot } from 'grammy';
import type { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getErrorMessage, Logger } from '@core/utils';
import { getResponse } from '@services/openai';
import { GPT_SMALL_MODEL } from '@services/openai/constants';
import { sendShortenedMessage } from '@services/telegram';
import { deletePendingPosts, getPendingPosts } from '@shared/social-follower';
import type { PendingPost, SocialPlatform } from '@shared/social-follower';

const logger = new Logger('SocialMediaDigestScheduler');

const PLATFORM_LABELS = { tiktok: 'TikTok 🎵', twitter: 'X (Twitter) 🐦', youtube: 'YouTube 📺', telegram: 'Telegram 📣' } as const;
const SUMMARIZED_PLATFORMS: SocialPlatform[] = ['twitter']; // chatty platforms get AI topic summaries; the rest list each post
const MAX_FALLBACK_POSTS = 15; // raw listing cap when summarization fails
const LONG_POST_THRESHOLD = 280; // posts longer than this hard-truncate when AI shortening fails

const summarySchema = z.object({
  keyPoints: z.array(z.string()).describe('The key points of what the author posted about, one bullet per distinct topic'),
});

const shortenSchema = z.object({
  shortened: z.array(z.string()).describe('The shortened posts, one per input post, in the same order as the input'),
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
      logger.error(`Failed to build digest section for ${userPosts[0].platform}/@${userPosts[0].username}: ${getErrorMessage(err)}`);
      sections.push(buildListingSection(userPosts, MAX_FALLBACK_POSTS));
    }
  }

  const message = `*Daily social media digest* 🔔\n\n${sections.join('\n\n')}`;
  try {
    await sendShortenedMessage(bot, chatId, message, { parse_mode: 'Markdown' }).catch(() => sendShortenedMessage(bot, chatId, message.replace(/[*_`[\]]/g, '')));
    await deletePendingPosts(posts.map((post) => post._id).filter(Boolean) as ObjectId[]);
  } catch (err) {
    logger.error(`Failed to send digest to chat ${chatId}, keeping posts for next digest: ${getErrorMessage(err)}`);
  }
}

async function buildUserSection(userPosts: PendingPost[]): Promise<string> {
  if (userPosts[0].platform === 'telegram') {
    return buildTelegramListingSection(userPosts);
  }
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

export function isLongPost(text: string | null): boolean {
  return !!text && text.length > LONG_POST_THRESHOLD;
}

function telegramPostLine(text: string, url: string | null): string {
  const clean = text.replace(/\s+/g, ' ').trim() || '(no caption)';
  return url ? `- ${clean} — [link](${url})` : `- ${clean}`;
}

// Renders one line per Telegram post (newest first) with a direct message link.
// Every post is AI-shortened to a 1-2 sentence description so the digest stays scannable.
async function buildTelegramListingSection(userPosts: PendingPost[]): Promise<string> {
  const displayTexts = await shortenPosts(userPosts.map((post) => post.text));
  const lines = userPosts.map((post, i) => telegramPostLine(displayTexts[i], post.url));
  return `${sectionHeader(userPosts)}\n${lines.join('\n')}`;
}

// Returns display text per post, shortening every post with text into a 1-2 sentence
// description in one AI call (index-aligned); on failure they hard-truncate long posts.
async function shortenPosts(texts: (string | null)[]): Promise<string[]> {
  const indexesToShorten = texts.map((text, i) => (text?.trim() ? i : -1)).filter((i) => i !== -1);
  if (!indexesToShorten.length) {
    return texts.map((text) => text ?? '');
  }

  const postsToShorten = indexesToShorten.map((i) => texts[i]);
  const instructions = [
    `You shorten social media posts so a daily digest stays scannable.`,
    `You will receive ${postsToShorten.length} posts. Return exactly ${postsToShorten.length} shortened versions, in the same order.`,
    `Each shortened version is 1-2 short sentences describing what the post is about. Do not add opinions or information not in the post.`,
    `Write each shortened version in the same language the post is written in.`,
  ].join('\n');
  const input = postsToShorten.map((text, i) => `Post ${i + 1}:\n${text}`).join('\n\n');

  try {
    const { result } = await getResponse({ instructions, input, schema: shortenSchema, model: GPT_SMALL_MODEL, store: false });
    if (result.shortened.length !== postsToShorten.length) {
      throw new Error(`expected ${postsToShorten.length} shortened posts, got ${result.shortened.length}`);
    }
    const shortenedByIndex = new Map(indexesToShorten.map((originalIndex, k) => [originalIndex, result.shortened[k]]));
    return texts.map((text, i) => shortenedByIndex.get(i) ?? text ?? '');
  } catch (err) {
    logger.error(`Failed to shorten Telegram posts, falling back to truncation: ${getErrorMessage(err)}`);
    return texts.map((text) => (isLongPost(text) ? `${text.slice(0, LONG_POST_THRESHOLD)}…` : (text ?? '')));
  }
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
