import { MongoServerError, ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Subscription } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<Subscription>(DB_NAME, 'Subscription');

// throws on database errors - an empty list would tell the user they have no alerts
export async function getActiveSubscriptions(chatId: number = null): Promise<Subscription[]> {
  const subscriptionCollection = getCollection();
  const filter = { isActive: true };
  if (chatId) filter['chatId'] = chatId;
  return subscriptionCollection.find(filter).toArray();
}

export async function getSubscription(chatId: number, restaurant: string): Promise<Subscription> {
  const subscriptionCollection = getCollection();
  const filter = { chatId, restaurant, isActive: true };
  return subscriptionCollection.findOne(filter);
}

export async function getSubscriptionById(id: string): Promise<Subscription | null> {
  if (!ObjectId.isValid(id)) return null;
  return getCollection().findOne({ _id: new ObjectId(id) });
}

export async function addSubscription(chatId: number, restaurant: string, restaurantPhoto: string, restaurantId?: string, expiresAt?: Date) {
  const subscriptionCollection = getCollection();
  const subscription = {
    chatId,
    restaurant,
    restaurantId,
    restaurantPhoto,
    isActive: true,
    createdAt: new Date(),
    expiresAt,
  } as Subscription;
  try {
    return await subscriptionCollection.insertOne(subscription);
  } catch (err) {
    // the user already has an active subscription for this restaurant (e.g. a double-tapped button) - nothing to add
    if (err instanceof MongoServerError && err.code === 11000) return null;
    throw err;
  }
}

export async function archiveSubscription(chatId: number, restaurant: string, isSuccess: boolean) {
  const subscriptionCollection = getCollection();
  const filter = { chatId, restaurant, isActive: true };
  const updateObj = { $set: { isActive: false, isSuccess, finishedAt: new Date() } } as Partial<Subscription>;
  return subscriptionCollection.updateOne(filter, updateObj);
}

export async function getExpiredSubscriptions(subscriptionExpirationHours: number): Promise<Subscription[]> {
  const subscriptionCollection = getCollection();
  const now = new Date();
  const validLimitTimestamp = new Date(now.getTime() - subscriptionExpirationHours * 60 * 60 * 1000);
  // subscriptions created before expiresAt was stored fall back to the fixed expiration
  const filter = { isActive: true, $or: [{ expiresAt: { $lt: now } }, { expiresAt: null, createdAt: { $lt: validLimitTimestamp } }] };
  return subscriptionCollection.find(filter).toArray();
}

export async function getTopBy(topBy: 'restaurant' | 'chatId'): Promise<any[]> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.aggregate([{ $group: { _id: `$${topBy}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]).toArray();
}

// one active subscription per user and restaurant; archived ones are kept as history
export async function ensureSubscriptionIndexes(): Promise<void> {
  await getCollection().createIndex({ chatId: 1, restaurant: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
}
