import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { Bot } from 'grammy';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { getResponse } from '@services/openai';
import { GPT_SMALL_MODEL } from '@services/openai/constants';
import { sendShortenedMessage, TELEGRAM_MAX_MESSAGE_LENGTH } from '@services/telegram';
import { claimDigestDelivery, deletePendingPosts, getPendingPostBacklog, getPendingPostChatIds, getPendingPostsForChat, markDigestTextDelivered } from '@shared/social-follower';
import type { DigestImageEntry, DigestVideoEntry, PendingPost, SocialPlatform } from '@shared/social-follower';
import { CHATBOT_CONFIG } from '../chatbot.config';
import { deliverDigestImages } from './social-media-image-delivery';
import { deliverDigestVideos } from './social-media-video-delivery';

const logger = new Logger('chatbot:scheduler:social-media-digest');

const DIGEST_TITLE = '*Daily social media digest* 🔔';
const SECTION_SEPARATOR = '\n\n';

// One user's rendered digest text plus the posts it represents, so we only
// acknowledge (delete) posts that actually made it into a delivered message.
export type DigestSection = {
  readonly text: string;
  readonly posts: PendingPost[];
};

const PLATFORM_LABELS = { tiktok: 'TikTok 🎵', twitter: 'X (Twitter) 🐦', youtube: 'YouTube 📺', telegram: 'Telegram 📣' } as const;
const DIGEST_PLATFORM_ORDER: readonly SocialPlatform[] = ['telegram', 'twitter', 'youtube', 'tiktok'];
const SUMMARIZED_PLATFORMS: SocialPlatform[] = ['twitter']; // chatty platforms get AI topic summaries; the rest list each post
const MAX_FALLBACK_POSTS = 15; // raw listing cap when summarization fails
const LONG_POST_THRESHOLD = 280; // posts longer than this hard-truncate when AI shortening fails
// Upper bound on how many of one account's posts are fed into a single AI request, so a
// delivery outage that inflates the backlog can't grow the request past the model's budget.
// Newest posts are preferred; the rest are listed deterministically without AI.
export const MAX_AI_POSTS_PER_ACCOUNT = 40;
// Model-aware text budget (in characters, a deterministic token proxy) for the post text fed
// into a single AI request, on top of the post-count cap. Long-form posts (e.g. long-form
// tweets) can be arbitrarily large, so the count cap alone does not bound request size or
// cost. Character count keeps this tokenizer-free and consistent with the char-based
// thresholds elsewhere in this file. The budget reserves headroom for the instructions
// prompt and the model's output; ~1 char ≈ ¼ token, so 24k chars ≈ 6k input tokens.
export const MAX_AI_INPUT_CHARS = 24_000;
// A single post is never allowed to consume more than this share of the input budget, so one
// oversized post can't crowd out every other post in the same request. Oversized post text is
// truncated to fit (handled explicitly) rather than rejected by the model or dropped.
export const MAX_AI_CHARS_PER_POST = 4_000;
const TRUNCATION_MARKER = '…';

const summarySchema = z.object({
  keyPoints: z.array(z.string()).describe('The key points of what the author posted about, one bullet per distinct topic'),
});

const shortenSchema = z.object({
  shortened: z.array(z.string()).describe('The shortened posts, one per input post, in the same order as the input'),
});

// Sends the daily digest of everything the collectors stored since the last digest,
// then deletes exactly the posts that were sent (later arrivals roll into the next day).
// Iterates one chat at a time with a bounded query so a runaway backlog can't pull the
// whole collection into memory.
export async function socialMediaDigest(bot: Bot): Promise<void> {
  const digestDate = digestDateFor();
  const chatIds = await getPendingPostChatIds();

  for (const chatId of chatIds) {
    const posts = await getPendingPostsForChat(chatId);
    if (!posts.length) {
      continue;
    }
    await logBacklog(chatId, posts.length);
    await processDigestForChat(bot, chatId, posts, digestDate);
  }
}

// Surfaces how far behind delivery has fallen: total pending count and how old the oldest
// still-pending post is. A digest run only carries a bounded slice, so this is the signal
// that a chat's backlog is growing beyond one run.
async function logBacklog(chatId: number, loadedCount: number): Promise<void> {
  try {
    const { count, oldestPostedAt } = await getPendingPostBacklog(chatId);
    const oldestAgeHours = oldestPostedAt ? Math.round((Date.now() - oldestPostedAt.getTime()) / 3_600_000) : 0;
    logger.log(`Chat ${chatId} backlog: ${count} pending (processing ${loadedCount}), oldest ${oldestAgeHours}h old`);
  } catch (err) {
    logger.error(`Failed to read backlog stats for chat ${chatId}: ${getErrorMessage(err)}`);
  }
}

// Runs one chat's digest keyed to a single `digestDate` supplied by the caller (computed once per
// run) so a long run that crosses local midnight buckets every chat under the same day.
export async function processDigestForChat(bot: Bot, chatId: number, posts: PendingPost[], digestDate: string): Promise<void> {
  // Fix the video selection once per (chat, local date) so restarts/concurrent runs converge on
  // the same set, and snapshot each video's fields so deleting the pending posts is still safe.
  const videos = CHATBOT_CONFIG.videoDigest.enabled ? selectTikTokPendingPosts(posts, CHATBOT_CONFIG.videoDigest.maxVideosPerChat).map(toVideoEntry) : [];
  const images = CHATBOT_CONFIG.imageDigest.enabled ? selectTwitterImagePendingPosts(posts, CHATBOT_CONFIG.imageDigest.maxPostsPerChat).map(toImageEntry) : [];
  const record = await claimDigestDelivery({ chatId, digestDate, videos, images });

  let deliveredAny = !!record.textDeliveredAt;
  if (!record.textDeliveredAt) {
    const outcome = await sendTextDigest(bot, chatId, posts);
    deliveredAny = outcome.deliveredAny;
    if (outcome.deliveredAll) {
      await markDigestTextDelivered(chatId, digestDate);
    }
  }

  // Videos ride along only once the text digest was actually delivered (never on a total send
  // failure), and only when the feature is enabled. The record drives delivery from here.
  if (CHATBOT_CONFIG.videoDigest.enabled && deliveredAny) {
    await deliverDigestVideos(bot, chatId, digestDate);
  }
  if (CHATBOT_CONFIG.imageDigest.enabled && deliveredAny) {
    await deliverDigestImages(bot, chatId, digestDate);
  }
}

// Local (Asia/Jerusalem) calendar date used to key one chat's digest, so "today" matches how the
// 22:45 cron reads to the user regardless of the server's timezone.
export function digestDateFor(date: Date = new Date()): string {
  return format(toZonedTime(date, DEFAULT_TIMEZONE), 'yyyy-MM-dd');
}

// Picks up to `max` of the newest collected TikTok posts across all followed TikTok accounts.
// Posts arrive oldest-first, so this sorts newest-first before slicing. Posts without an `_id`
// are skipped: their entry could never be claimed/finalized (no stable id) and they can't be
// acknowledged/deleted safely anyway, so there is nothing to snapshot.
export function selectTikTokPendingPosts(posts: PendingPost[], max: number): PendingPost[] {
  if (max <= 0) {
    return [];
  }
  return posts
    .filter((post) => post.platform === 'tiktok' && !!post._id)
    .sort((a, b) => {
      const byTime = b.postedAt.getTime() - a.postedAt.getTime();
      return byTime !== 0 ? byTime : String(b._id ?? '').localeCompare(String(a._id ?? ''));
    })
    .slice(0, max);
}

// Newest-first tweets that carry photos, same `_id` rule as the TikTok selection.
export function selectTwitterImagePendingPosts(posts: PendingPost[], max: number): PendingPost[] {
  if (max <= 0) {
    return [];
  }
  return posts
    .filter((post) => post.platform === 'twitter' && !!post._id && !!post.imageUrls?.length)
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    .slice(0, max);
}

function toImageEntry(post: PendingPost): DigestImageEntry {
  return {
    entryId: post._id!.toHexString(),
    username: post.username,
    displayName: post.displayName ?? null,
    postId: post.postId,
    url: post.url,
    text: post.text,
    imageUrls: post.imageUrls ?? [],
    state: 'pending',
  };
}

// Snapshots a pending post into a delivery-record entry so video delivery is decoupled from the
// pending post being deleted after the text digest is acknowledged. Only called with posts that
// have an `_id` (selection filters the rest out), so the entryId is always the real post id.
function toVideoEntry(post: PendingPost): DigestVideoEntry {
  return {
    entryId: post._id!.toHexString(),
    pendingPostId: post._id,
    username: post.username,
    displayName: post.displayName ?? null,
    postId: post.postId,
    url: post.url,
    text: post.text,
    state: 'pending',
  };
}

// Builds and sends the text digest exactly as before: pack sections into length-capped messages,
// send each, and delete only the posts whose message was delivered. Returns whether any/all
// chunks were delivered so the caller can gate video delivery and the idempotency flag.
async function sendTextDigest(bot: Bot, chatId: number, posts: PendingPost[]): Promise<{ readonly deliveredAny: boolean; readonly deliveredAll: boolean }> {
  const sections: DigestSection[] = [];

  for (const userPosts of groupPostsByUser(posts)) {
    try {
      sections.push({ text: await buildUserSection(userPosts), posts: userPosts });
    } catch (err) {
      logger.error(`Failed to build digest section for ${userPosts[0].platform}/@${userPosts[0].username}: ${getErrorMessage(err)}`);
      sections.push({ text: buildListingSection(userPosts, MAX_FALLBACK_POSTS), posts: userPosts });
    }
  }

  // Pack sections into messages that fit Telegram's length cap, then send each
  // message and only acknowledge (delete) the posts whose message was delivered.
  // This preserves undelivered posts across truncation, partial failures, and restarts.
  let deliveredAny = false;
  let deliveredAll = true;
  for (const chunk of chunkSections(sections)) {
    const delivered = await sendDigestMessage(bot, chatId, chunk.text);
    if (!delivered) {
      logger.error(`Failed to send digest chunk to chat ${chatId}, keeping ${chunk.posts.length} posts for next digest`);
      deliveredAll = false;
      continue;
    }
    deliveredAny = true;
    const ids = chunk.posts.map((post) => post._id).filter(Boolean) as ObjectId[];
    if (ids.length) {
      await deletePendingPosts(ids);
    }
  }
  return { deliveredAny, deliveredAll };
}

// Sends one digest message with a Markdown-stripped plain-text fallback.
// Returns whether the message was delivered so the caller can decide what to acknowledge.
async function sendDigestMessage(bot: Bot, chatId: number, text: string): Promise<boolean> {
  try {
    await sendShortenedMessage(bot, chatId, text, { parse_mode: 'Markdown' }).catch(() => sendShortenedMessage(bot, chatId, text.replace(/[*_`[\]]/g, '')));
    return true;
  } catch (err) {
    logger.error(`Failed to send digest message to chat ${chatId}: ${getErrorMessage(err)}`);
    return false;
  }
}

// Groups sections into as few messages as possible, each fitting within Telegram's
// length cap, splitting only at section (per-user) boundaries. The first message
// carries the digest title. A single section that is itself too long is sent on its
// own; the sender's slice still bounds it, but no other section's posts are lost with it.
export function chunkSections(sections: DigestSection[]): DigestSection[] {
  const chunks: DigestSection[] = [];

  for (const section of sections) {
    const current = chunks[chunks.length - 1];
    const isFirstOverall = chunks.length === 0;
    if (current) {
      const candidate = `${current.text}${SECTION_SEPARATOR}${section.text}`;
      if (candidate.length <= TELEGRAM_MAX_MESSAGE_LENGTH) {
        chunks[chunks.length - 1] = { text: candidate, posts: [...current.posts, ...section.posts] };
        continue;
      }
    }
    const prefix = isFirstOverall ? `${DIGEST_TITLE}${SECTION_SEPARATOR}` : '';
    chunks.push({ text: `${prefix}${section.text}`, posts: [...section.posts] });
  }

  return chunks;
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

// Splits an account's posts into the newest slice that goes through AI and the older
// overflow that is listed deterministically, so a big backlog can't grow an AI request
// past the model's budget. Posts arrive oldest-first, so the newest are at the end.
//
// Budgeting happens in two stages so both concerns are explicit:
//   1. A post-COUNT cap (maxAiPosts) keeps a runaway backlog bounded.
//   2. A model-aware text-SIZE budget (maxInputChars) then bounds the total characters fed
//      to the model, since a handful of long-form posts can dwarf the count cap. Posts are
//      taken newest-first until the budget is exhausted; the remainder overflows.
// An individually oversized post is TRUNCATED to its per-post cap (handled explicitly) rather
// than rejected by the model or dropped — its returned text is the truncated text, and it
// still counts as one AI post so the post-to-output acknowledgement mapping is preserved.
export function splitForAiBudget(
  userPosts: PendingPost[],
  maxAiPosts: number = MAX_AI_POSTS_PER_ACCOUNT,
  maxInputChars: number = MAX_AI_INPUT_CHARS,
  maxCharsPerPost: number = MAX_AI_CHARS_PER_POST,
): { readonly aiPosts: PendingPost[]; readonly overflowPosts: PendingPost[] } {
  // Stage 1: cap by count, keeping the newest posts (they sit at the end, oldest-first).
  const countOverflow = userPosts.length > maxAiPosts ? userPosts.slice(0, userPosts.length - maxAiPosts) : [];
  const countCapped = userPosts.length > maxAiPosts ? userPosts.slice(-maxAiPosts) : userPosts;

  // Stage 2: cap by text size, walking newest-first, truncating any single oversized post.
  // A post enters the request only if its per-post-capped text fits the remaining budget in
  // full; we never shrink an older post below its per-post cap just to squeeze it in, since a
  // tiny fragment isn't useful in a digest. The single newest post is the exception: it is
  // always kept, truncated to fit, so an account with one huge post still gets summarized.
  // budgetStart is the index in countCapped of the oldest post that still fits the budget.
  const budgeted: PendingPost[] = [];
  let remaining = maxInputChars;
  let budgetStart = countCapped.length;
  for (let i = countCapped.length - 1; i >= 0; i -= 1) {
    const isNewest = budgeted.length === 0;
    const perPostCap = isNewest ? Math.min(maxCharsPerPost, remaining) : maxCharsPerPost;
    const budgetedPost = clampPostText(countCapped[i], perPostCap);
    const usedChars = budgetedPost.text?.length ?? 0;
    if (usedChars > remaining && !isNewest) {
      break;
    }
    budgeted.unshift(budgetedPost);
    remaining -= usedChars;
    budgetStart = i;
  }

  // Overflow keeps oldest-first order: count-cap overflow, then any budget overflow after it.
  const overflowPosts = [...countOverflow, ...countCapped.slice(0, budgetStart)];
  return { aiPosts: budgeted, overflowPosts };
}

// Returns the post unchanged when its text fits maxChars, otherwise a copy whose text is
// hard-truncated to maxChars (with a marker) so one oversized post can't blow the AI budget.
function clampPostText(post: PendingPost, maxChars: number): PendingPost {
  const text = post.text;
  if (!text || text.length <= maxChars) {
    return post;
  }
  const sliceLength = Math.max(0, maxChars - TRUNCATION_MARKER.length);
  return { ...post, text: `${text.slice(0, sliceLength)}${TRUNCATION_MARKER}` };
}

function overflowNote(overflowCount: number): string {
  return overflowCount > 0 ? `\n- ...and ${overflowCount} older post(s) not summarized` : '';
}

// Renders one line per Telegram post (newest first) with a direct message link.
// The newest posts are AI-shortened to a 1-2 sentence description so the digest stays
// scannable; older overflow beyond the AI budget is listed without AI.
async function buildTelegramListingSection(userPosts: PendingPost[]): Promise<string> {
  const { aiPosts, overflowPosts } = splitForAiBudget(userPosts);
  const displayTexts = await shortenPosts(aiPosts.map((post) => post.text));
  const lines = aiPosts.map((post, i) => telegramPostLine(displayTexts[i], post.url));
  return `${sectionHeader(userPosts)}\n${lines.join('\n')}${overflowNote(overflowPosts.length)}`;
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
  const { aiPosts, overflowPosts } = splitForAiBudget(userPosts);
  const texts = aiPosts.map((post) => post.text).filter(Boolean);
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
  return `${sectionHeader(userPosts)}\n${bullets}${overflowNote(overflowPosts.length)}`;
}

// Summary length scales with volume: 4 posts -> 2 points, 100 posts -> 10 points
export function targetKeyPointsCount(postsCount: number): number {
  return Math.min(10, Math.max(2, Math.ceil(postsCount / 10)));
}

export function groupPostsByUser(posts: PendingPost[]): PendingPost[][] {
  const postsByUser = groupBy(posts, (post) => `${post.platform}:${post.username}`);
  return DIGEST_PLATFORM_ORDER.flatMap((platform) => [...postsByUser.values()].filter((userPosts) => userPosts[0].platform === platform));
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
