import { InsertOneResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from '.';
import { TwitterSubscription } from '../types';

const getCollection = () => getMongoCollection<TwitterSubscription>(DB_NAME, 'Subscription');

export async function getSubscriptions(chatId: number): Promise<TwitterSubscription[]> {
  const subscriptionCollection = getCollection();
  const filter = { chatId };
  return subscriptionCollection.find(filter).sort({ subscribedAt: -1 }).toArray();
}

export async function getSubscriptionByUsername(chatId: number, username: string): Promise<TwitterSubscription | null> {
  const subscriptionCollection = getCollection();
  const filter = { chatId, username: username.toLowerCase() };
  return subscriptionCollection.findOne(filter);
}

export async function addSubscription(subscription: Omit<TwitterSubscription, '_id'>): Promise<InsertOneResult<TwitterSubscription>> {
  const subscriptionCollection = getCollection();
  const subscriptionData = {
    ...subscription,
    username: subscription.username.toLowerCase(),
  } as TwitterSubscription;
  return subscriptionCollection.insertOne(subscriptionData);
}

export async function removeSubscription(chatId: number, username: string): Promise<boolean> {
  const subscriptionCollection = getCollection();
  const filter = { chatId, username: username.toLowerCase() };
  const result = await subscriptionCollection.deleteOne(filter);
  return result.deletedCount > 0;
}

export async function getAllActiveSubscriptions(): Promise<TwitterSubscription[]> {
  const subscriptionCollection = getCollection();
  return subscriptionCollection.find({}).toArray();
}

export async function updateLastFetched(twitterUserId: string): Promise<void> {
  const subscriptionCollection = getCollection();
  const filter = { twitterUserId };
  const updateObj = { $set: { lastFetchedAt: new Date() } };
  await subscriptionCollection.updateOne(filter, updateObj);
}
