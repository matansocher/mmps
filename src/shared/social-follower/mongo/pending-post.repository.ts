import type { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreatePendingPostData, PendingPost } from '../types';
import { DB_NAME, PENDING_POST_CHAT_BATCH_SIZE, PENDING_POST_TTL_SECONDS } from './constants';

function getCollection() {
  return getMongoCollection<PendingPost>(DB_NAME, 'PendingPost');
}

// Backlog size and age of the oldest still-pending post for a chat, so the digest can
// surface how far behind delivery has fallen without loading every document.
export type PendingPostBacklog = {
  readonly chatId: number;
  readonly count: number;
  readonly oldestPostedAt: Date | null;
};

export async function ensurePendingPostIndexes(): Promise<void> {
  const collection = getCollection();
  // Backs the deterministic per-chat, oldest-first digest query below.
  await collection.createIndex({ chatId: 1, postedAt: 1, _id: 1 });
  // Backs the dedupe lookup in createPendingPosts (collector retries after a crash).
  await collection.createIndex({ platform: 1, username: 1, chatId: 1, postId: 1 });
  // Explicit retention: a backlog left undelivered past the TTL is expired, not kept forever.
  await collection.createIndex({ collectedAt: 1 }, { expireAfterSeconds: PENDING_POST_TTL_SECONDS });
}

export async function createPendingPosts(posts: CreatePendingPostData[]): Promise<void> {
  if (!posts.length) {
    return;
  }
  const collection = getCollection();
  const collectedAt = new Date();
  // Skip posts already collected (collector retries after a crash between insert and lastSeen update)
  const existing = await collection.find({ $or: posts.map(({ platform, username, chatId, postId }) => ({ platform, username, chatId, postId })) }).toArray();
  const existingKeys = new Set(existing.map((post) => `${post.platform}:${post.username}:${post.chatId}:${post.postId}`));
  const newPosts = posts.filter((post) => !existingKeys.has(`${post.platform}:${post.username}:${post.chatId}:${post.postId}`));
  if (!newPosts.length) {
    return;
  }
  await collection.insertMany(newPosts.map((post) => ({ ...post, collectedAt }) as PendingPost));
}

// Chats that currently have at least one pending post, so the digest iterates per chat
// instead of loading the entire collection into memory at once.
export async function getPendingPostChatIds(): Promise<number[]> {
  const collection = getCollection();
  return collection.distinct('chatId', {});
}

// One chat's pending posts, oldest first, capped so a single runaway backlog can't blow
// up memory. The deterministic { postedAt, _id } order matches the compound index.
export async function getPendingPostsForChat(chatId: number, limit: number = PENDING_POST_CHAT_BATCH_SIZE): Promise<PendingPost[]> {
  const collection = getCollection();
  return collection.find({ chatId }).sort({ postedAt: 1, _id: 1 }).limit(limit).toArray();
}

export async function getPendingPostBacklog(chatId: number): Promise<PendingPostBacklog> {
  const collection = getCollection();
  const [count, oldest] = await Promise.all([collection.countDocuments({ chatId }), collection.find({ chatId }).sort({ postedAt: 1, _id: 1 }).limit(1).next()]);
  return { chatId, count, oldestPostedAt: oldest?.postedAt ?? null };
}

export async function deletePendingPosts(ids: ObjectId[]): Promise<void> {
  if (!ids.length) {
    return;
  }
  const collection = getCollection();
  await collection.deleteMany({ _id: { $in: ids } });
}
