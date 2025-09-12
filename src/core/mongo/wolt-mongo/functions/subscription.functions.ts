import { getCollection, getMongoDb } from '@core/mongo/shared/mongo-connection';
import { Subscription } from '../models';
import { COLLECTIONS, DB_NAME } from '../wolt-mongo.config';

export async function getActiveSubscriptions(chatId: number = null): Promise<Subscription[]> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  try {
    const filter = { isActive: true };
    if (chatId) filter['chatId'] = chatId;
    return collection.find(filter).toArray();
  } catch (err) {
    console.error(`getActiveSubscriptions - err: ${err}`);
    return [];
  }
}

export async function getSubscription(chatId: number, restaurant: string): Promise<Subscription> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const filter = { chatId, restaurant, isActive: true };
  return collection.findOne(filter);
}

export async function addSubscription(chatId: number, restaurant: string, restaurantPhoto: string) {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const subscription = {
    chatId,
    restaurant,
    restaurantPhoto,
    isActive: true,
    createdAt: new Date(),
  } as Subscription;
  return collection.insertOne(subscription);
}

export async function archiveSubscription(chatId: number, restaurant: string, isSuccess: boolean) {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const filter = { chatId, restaurant, isActive: true };
  const updateObj = { $set: { isActive: false, isSuccess, finishedAt: new Date() } } as Partial<Subscription>;
  return collection.updateOne(filter, updateObj);
}

export async function getExpiredSubscriptions(subscriptionExpirationHours: number): Promise<Subscription[]> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const validLimitTimestamp = new Date(Date.now() - subscriptionExpirationHours * 60 * 60 * 1000);
  const filter = { isActive: true, createdAt: { $lt: validLimitTimestamp } };
  return collection.find(filter).toArray();
}

export async function getTopBy(topBy: 'restaurant' | 'chatId'): Promise<any[]> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  return collection.aggregate([{ $group: { _id: `$${topBy}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]).toArray();
}
