import type { InsertOneResult, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreateSocialSubscriptionData, SocialPlatform, SocialSubscription, UpdateLastSeenData } from '../types';
import { DB_NAME } from './constants';

function getCollection() {
  return getMongoCollection<SocialSubscription>(DB_NAME, 'Subscription');
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

export async function createSubscription(data: CreateSocialSubscriptionData): Promise<InsertOneResult<SocialSubscription>> {
  const collection = getCollection();
  const subscription: Omit<SocialSubscription, '_id'> = {
    platform: data.platform,
    username: data.username,
    chatId: data.chatId,
    lastSeenId: data.lastSeenId ?? null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return collection.insertOne(subscription as SocialSubscription);
}

export async function updateLastSeen(platform: SocialPlatform, username: string, chatId: number, data: UpdateLastSeenData): Promise<UpdateResult> {
  const collection = getCollection();
  return collection.updateOne({ platform, username, chatId, isActive: true }, { $set: { ...data, updatedAt: new Date() } });
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
