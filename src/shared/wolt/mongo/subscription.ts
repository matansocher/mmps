import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import { Subscription } from '../types';
import { DB_NAME } from './index';

const logger = new Logger('subscription');

const getCollection = () => getMongoCollection<Subscription>(DB_NAME, 'Subscription');

export async function getActiveSubscriptions(chatId: number = null): Promise<Subscription[]> {
  try {
    const subscriptionCollection = getCollection();
    const filter = { isActive: true };
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

export async function addSubscription(chatId: number, restaurant: string, restaurantPhoto: string) {
  const subscriptionCollection = getCollection();
  const subscription = {
    chatId,
    restaurant,
    restaurantPhoto,
    isActive: true,
    createdAt: new Date(),
  } as Subscription;
  return subscriptionCollection.insertOne(subscription);
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
  const filter = { isActive: true, createdAt: { $lt: validLimitTimestamp } };
  return subscriptionCollection.find(filter).toArray();
}

export async function getTopBy(topBy: 'restaurant' | 'chatId'): Promise<any[]> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.aggregate([{ $group: { _id: `$${topBy}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]).toArray();
}
