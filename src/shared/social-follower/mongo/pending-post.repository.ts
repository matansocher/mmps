import type { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreatePendingPostData, PendingPost } from '../types';
import { DB_NAME } from './constants';

function getCollection() {
  return getMongoCollection<PendingPost>(DB_NAME, 'PendingPost');
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

export async function getPendingPosts(): Promise<PendingPost[]> {
  const collection = getCollection();
  return collection.find({}).sort({ postedAt: 1 }).toArray();
}

export async function deletePendingPosts(ids: ObjectId[]): Promise<void> {
  if (!ids.length) {
    return;
  }
  const collection = getCollection();
  await collection.deleteMany({ _id: { $in: ids } });
}
