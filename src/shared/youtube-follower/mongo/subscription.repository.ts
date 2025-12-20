import type { InsertOneResult, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import type { CreateSubscriptionData, Subscription, UpdateSubscriptionData } from '../types';
import { DB_NAME } from './index';

const logger = new Logger('subscription.repository');

function getCollection() {
  return getMongoCollection<Subscription>(DB_NAME, 'Subscription');
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  try {
    const subscriptionCollection = getCollection();
    return subscriptionCollection.find({ isActive: true }).toArray();
  } catch (err) {
    logger.error(`getActiveSubscriptions - err: ${err}`);
    return [];
  }
}

export async function getAllActiveSubscriptions(): Promise<Subscription[]> {
  try {
    const subscriptionCollection = getCollection();
    return subscriptionCollection.find({ isActive: true }).toArray();
  } catch (err) {
    logger.error(`getAllActiveSubscriptions - err: ${err}`);
    return [];
  }
}

export async function getSubscription(channelId: string): Promise<Subscription | null> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.findOne({ channelId, isActive: true });
}

export async function createSubscription(data: CreateSubscriptionData): Promise<InsertOneResult<Subscription>> {
  const subscriptionCollection = getCollection();
  const subscription: Omit<Subscription, '_id'> = {
    channelId: data.channelId,
    channelName: data.channelName,
    channelHandle: data.channelHandle,
    channelUrl: data.channelUrl,
    lastNotifiedVideoId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return subscriptionCollection.insertOne(subscription as Subscription);
}

export async function updateSubscription(channelId: string, data: UpdateSubscriptionData): Promise<UpdateResult> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.updateOne({ channelId, isActive: true }, { $set: { ...data, updatedAt: new Date() } });
}

export async function removeSubscription(channelId: string): Promise<UpdateResult> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.updateOne({ channelId, isActive: true }, { $set: { isActive: false, updatedAt: new Date() } });
}
