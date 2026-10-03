import { MongoServerError, ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { getErrorMessage, Logger } from '@core/utils';
import { Subscription } from '../types';
import { DB_NAME } from './constants';

const logger = new Logger('wolt:subscription');

const getCollection = () => getMongoCollection<Subscription>(DB_NAME, 'Subscription');

export async function getActiveSubscriptions(chatId: number = null): Promise<Subscription[]> {
  try {
    const subscriptionCollection = getCollection();
    const filter = { isActive: true };
    if (chatId) filter['chatId'] = chatId;
    return await subscriptionCollection.find(filter).toArray();
  } catch (err) {
    logger.error(`getActiveSubscriptions - err: ${getErrorMessage(err)}`);
    return [];
  }
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

// archives this exact record only if it is still active - returns false when it was already archived (removed, alerted or expired)
export async function archiveSubscription(id: ObjectId, isSuccess: boolean): Promise<boolean> {
  const subscriptionCollection = getCollection();
  const filter = { _id: id, isActive: true };
  const updateObj = { $set: { isActive: false, isSuccess, finishedAt: new Date() } } as Partial<Subscription>;
  const result = await subscriptionCollection.updateOne(filter, updateObj);
  return result.modifiedCount === 1;
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

const LEGACY_NAME_INDEX = 'chatId_1_restaurant_1';
const INDEX_NOT_FOUND_CODE = 27;

// one active subscription per user and venue; archived ones are kept as history.
// keyed by venue id so same-name branches can be tracked separately - records from before ids were stored are skipped
export async function ensureSubscriptionIndexes(): Promise<void> {
  const collection = getCollection();
  await collection.dropIndex(LEGACY_NAME_INDEX).catch((err) => {
    if (!(err instanceof MongoServerError && err.code === INDEX_NOT_FOUND_CODE)) throw err;
  });
  await collection.createIndex({ chatId: 1, restaurantId: 1 }, { unique: true, partialFilterExpression: { isActive: true, restaurantId: { $exists: true } } });
}
