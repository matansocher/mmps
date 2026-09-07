import { MongoServerError, type UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import type { CreateSocialSubscriptionData, SocialPlatform, SocialSubscription, UpdateLastSeenData } from '../types';
import { DB_NAME } from './constants';

const logger = new Logger('SocialSubscriptionRepository');

function getCollection() {
  return getMongoCollection<SocialSubscription>(DB_NAME, 'Subscription');
}

// Collapses any pre-existing duplicate active subscriptions (same platform+username+chatId)
// down to a single active row so the partial unique index below can be created. The oldest
// document is kept active; the rest are soft-deleted, preserving the isActive semantics.
async function migrateDuplicateActiveSubscriptions(): Promise<void> {
  const collection = getCollection();
  const duplicateGroups = await collection
    .aggregate<{ _id: { platform: SocialPlatform; username: string; chatId: number }; ids: SocialSubscription['_id'][] }>([
      { $match: { isActive: true } },
      { $sort: { createdAt: 1, _id: 1 } },
      { $group: { _id: { platform: '$platform', username: '$username', chatId: '$chatId' }, ids: { $push: '$_id' } } },
      { $match: { 'ids.1': { $exists: true } } },
    ])
    .toArray();

  for (const group of duplicateGroups) {
    const [, ...staleIds] = group.ids;
    await collection.updateMany({ _id: { $in: staleIds } }, { $set: { isActive: false, updatedAt: new Date() } });
    logger.warn(`collapsed ${staleIds.length} duplicate active subscription(s) for ${group._id.platform}/${group._id.username}/${group._id.chatId}`);
  }
}

export async function ensureSubscriptionIndexes(): Promise<void> {
  const collection = getCollection();
  // Existing duplicates would make the unique index creation fail; collapse them first.
  await migrateDuplicateActiveSubscriptions();
  // One active subscription per (platform, username, chatId). Partial filter preserves soft
  // deletion: multiple isActive:false rows for the same key are allowed, only one active.
  await collection.createIndex({ platform: 1, username: 1, chatId: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
}

export async function getActiveSubscriptions(platform?: SocialPlatform): Promise<SocialSubscription[]> {
  const collection = getCollection();
  return collection.find({ isActive: true, ...(platform ? { platform } : {}) }).toArray();
}

export async function getActiveSubscriptionsByChatId(chatId: number, platform?: SocialPlatform): Promise<SocialSubscription[]> {
  const collection = getCollection();
  return collection.find({ chatId, isActive: true, ...(platform ? { platform } : {}) }).toArray();
}

export async function getSubscription(platform: SocialPlatform, username: string, chatId: number): Promise<SocialSubscription | null> {
  const collection = getCollection();
  return collection.findOne({ platform, username, chatId, isActive: true });
}

export async function createSubscription(data: CreateSocialSubscriptionData): Promise<SocialSubscription> {
  const collection = getCollection();
  const now = new Date();
  const subscription: Omit<SocialSubscription, '_id'> = {
    platform: data.platform,
    username: data.username,
    displayName: data.displayName ?? null,
    chatId: data.chatId,
    lastSeenId: data.lastSeenId ?? null,
    lastSeenAt: data.lastSeenAt ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  // Atomic upsert keyed on the active-subscription identity. Concurrent calls or a checkpoint
  // replay converge on the same row instead of inserting duplicates ($setOnInsert leaves an
  // existing subscription untouched). The partial unique index is the hard guarantee; a racing
  // duplicate key still surfaces here and is resolved by re-reading the winning document.
  const filter = { platform: data.platform, username: data.username, chatId: data.chatId, isActive: true };
  try {
    await collection.updateOne(filter, { $setOnInsert: subscription }, { upsert: true });
  } catch (err) {
    // A concurrent upsert can still lose the unique-index race; that specific duplicate-key
    // outcome is expected and resolved by re-reading below. Anything else is a real failure.
    if (!(err instanceof MongoServerError) || err.code !== 11000) {
      throw err;
    }
  }
  const persisted = await collection.findOne(filter);
  if (!persisted) {
    throw new Error(`failed to persist subscription for ${data.platform}/${data.username}/${data.chatId}`);
  }
  return persisted;
}

export async function updateLastSeen(platform: SocialPlatform, username: string, chatId: number, data: UpdateLastSeenData): Promise<UpdateResult> {
  const collection = getCollection();
  return collection.updateOne({ platform, username, chatId, isActive: true }, { $set: { ...data, updatedAt: new Date() } });
}

export async function updateSecUid(username: string, chatId: number, secUid: string): Promise<UpdateResult> {
  const collection = getCollection();
  return collection.updateOne({ platform: 'tiktok', username, chatId, isActive: true }, { $set: { secUid, updatedAt: new Date() } });
}

export async function removeSubscription(platform: SocialPlatform, username: string, chatId: number): Promise<UpdateResult> {
  const collection = getCollection();
  return collection.updateOne({ platform, username, chatId, isActive: true }, { $set: { isActive: false, updatedAt: new Date() } });
}

export async function getSubscriptionsGroupedByChatId(): Promise<Map<number, SocialSubscription[]>> {
  const subscriptions = await getActiveSubscriptions();
  const grouped = new Map<number, SocialSubscription[]>();

  for (const subscription of subscriptions) {
    const existing = grouped.get(subscription.chatId) || [];
    existing.push(subscription);
    grouped.set(subscription.chatId, existing);
  }

  return grouped;
}
