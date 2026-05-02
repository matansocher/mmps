import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import { Subscription } from '../types';
import { DB_NAME } from './constants';

const logger = new Logger('subscription');

const getCollection = () => getMongoCollection<Subscription>(DB_NAME, 'Subscription');

export async function getActiveSubscriptions(chatId: number = null): Promise<Subscription[]> {
  try {
    const subscriptionCollection = getCollection();
    const filter: any = { isActive: true };
    if (chatId) filter['chatId'] = chatId;
    return subscriptionCollection.find(filter).toArray();
  } catch (err) {
    logger.error(`getActiveSubscriptions - err: ${err}`);
    return [];
  }
}

export async function getSubscription(chatId: number, restaurant: string): Promise<Subscription> {
  const subscriptionCollection = getCollection();
  const filter = { chatId, restaurant, isActive: true };
  return subscriptionCollection.findOne(filter);
}

export async function addSubscription(chatId: number, restaurant: string, restaurantPhoto: string, isPermanent: boolean = false) {
  const subscriptionCollection = getCollection();
  const subscription = {
    chatId,
    restaurant,
    restaurantPhoto,
    isActive: true,
    isSuccess: false,
    finishedAt: null,
    createdAt: new Date(),
    isPermanent,
    expiresAt: null,
    lastNotifiedOpenAt: null,
  } as Subscription;
  return subscriptionCollection.insertOne(subscription);
}

export async function setSubscriptionPermanent(chatId: number, restaurant: string, isPermanent: boolean) {
  const subscriptionCollection = getCollection();
  const filter = { chatId, restaurant, isActive: true };
  const updateObj: any = { $set: { isPermanent } };
  if (!isPermanent) {
    // reset createdAt so the temporary subscription will expire based on createdAt
    updateObj.$set.createdAt = new Date();
  }
  return subscriptionCollection.updateOne(filter, updateObj);
}

export async function setLastNotifiedOpenAt(chatId: number, restaurant: string, timestamp: number) {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.updateOne({ chatId, restaurant, isActive: true }, { $set: { lastNotifiedOpenAt: timestamp } });
}

export async function archiveSubscription(chatId: number, restaurant: string, isSuccess: boolean) {
  const subscriptionCollection = getCollection();
  const filter = { chatId, restaurant, isActive: true };
  const updateObj = { $set: { isActive: false, isSuccess, finishedAt: new Date() } } as Partial<Subscription>;
  return subscriptionCollection.updateOne(filter, updateObj);
}

export async function getExpiredSubscriptions(subscriptionExpirationHours: number): Promise<Subscription[]> {
  const subscriptionCollection = getCollection();
  const validLimitTimestamp = new Date(Date.now() - subscriptionExpirationHours * 60 * 60 * 1000);
  const filter: any = { isActive: true, isPermanent: { $ne: true }, createdAt: { $lt: validLimitTimestamp } };
  return subscriptionCollection.find(filter).toArray();
}

export async function getTopBy(topBy: 'restaurant' | 'chatId'): Promise<any[]> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.aggregate([{ $group: { _id: `$${topBy}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]).toArray();
}
