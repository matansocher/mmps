import type { InsertOneResult, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import type { CreateSubscriptionData, Platform, Subscription, UpdateSubscriptionData } from '../types';
import { DB_NAME } from './index';

const logger = new Logger('subscription.repository');

function getCollection() {
  return getMongoCollection<Subscription>(DB_NAME, 'Subscription');
}

export async function getActiveSubscriptions(chatId?: number): Promise<Subscription[]> {
  try {
    const subscriptionCollection = getCollection();
    const filter: any = { isActive: true };
    if (chatId !== undefined) {
      filter.chatId = chatId;
    }
    return subscriptionCollection.find(filter).toArray();
  } catch (err) {
    logger.error(`getActiveSubscriptions - err: ${err}`);
    return [];
  }
}

export async function getActiveSubscriptionsByPlatform(platform: Platform): Promise<Subscription[]> {
  try {
    const subscriptionCollection = getCollection();
    return subscriptionCollection.find({ isActive: true, platform }).toArray();
  } catch (err) {
    logger.error(`getActiveSubscriptionsByPlatform - err: ${err}`);
    return [];
  }
}

export async function getSubscription(chatId: number, channelId: string, platform: Platform): Promise<Subscription | null> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.findOne({ chatId, channelId, platform, isActive: true });
}

export async function createSubscription(data: CreateSubscriptionData): Promise<InsertOneResult<Subscription>> {
  const subscriptionCollection = getCollection();
  const subscription: Omit<Subscription, '_id'> = {
    chatId: data.chatId,
    platform: data.platform,
    channelId: data.channelId,
    channelName: data.channelName,
    channelUrl: data.channelUrl,
    lastNotifiedVideoId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return subscriptionCollection.insertOne(subscription as Subscription);
}

export async function updateSubscription(chatId: number, channelId: string, platform: Platform, data: UpdateSubscriptionData): Promise<UpdateResult> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.updateOne({ chatId, channelId, platform, isActive: true }, { $set: { ...data, updatedAt: new Date() } });
}

export async function removeSubscription(chatId: number, channelId: string, platform: Platform): Promise<UpdateResult> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.updateOne({ chatId, channelId, platform, isActive: true }, { $set: { isActive: false, updatedAt: new Date() } });
}
