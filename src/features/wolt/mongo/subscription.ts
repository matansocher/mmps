import { Collection, Db } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared';
import { Subscription } from '../types';
import { COLLECTIONS, DB_NAME } from './constants';

let db: Db;
let subscriptionCollection: Collection<Subscription>;

(async () => {
  db = await getMongoDb(DB_NAME);
  subscriptionCollection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);
})();

export async function getActiveSubscriptions(chatId: number = null): Promise<Subscription[]> {
  try {
    const filter = { isActive: true };
    if (chatId) filter['chatId'] = chatId;
    return subscriptionCollection.find(filter).toArray();
  } catch (err) {
    console.error(`getActiveSubscriptions - err: ${err}`);
    return [];
  }
}

export async function getSubscription(chatId: number, restaurant: string): Promise<Subscription> {
  const filter = { chatId, restaurant, isActive: true };
  return subscriptionCollection.findOne(filter);
}

export async function addSubscription(chatId: number, restaurant: string, restaurantPhoto: string) {
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
  const filter = { chatId, restaurant, isActive: true };
  const updateObj = { $set: { isActive: false, isSuccess, finishedAt: new Date() } } as Partial<Subscription>;
  return subscriptionCollection.updateOne(filter, updateObj);
}

export async function getExpiredSubscriptions(subscriptionExpirationHours: number): Promise<Subscription[]> {
  const validLimitTimestamp = new Date(Date.now() - subscriptionExpirationHours * 60 * 60 * 1000);
  const filter = { isActive: true, createdAt: { $lt: validLimitTimestamp } };
  return subscriptionCollection.find(filter).toArray();
}

export async function getTopBy(topBy: 'restaurant' | 'chatId'): Promise<any[]> {
  return subscriptionCollection.aggregate([{ $group: { _id: `$${topBy}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]).toArray();
}
