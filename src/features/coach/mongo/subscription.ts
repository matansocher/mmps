import { InsertOneResult } from 'mongodb';
import { getCollection } from '@core/mongo';
import { Subscription } from '../types';
import { dbName } from './index';

const getSubscriptionCollection = () => getCollection(dbName, 'Subscription');

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const subscriptionCollection = getSubscriptionCollection();
  const filter = { isActive: true };
  return subscriptionCollection.find(filter).toArray();
}

export async function getSubscription(chatId: number): Promise<Subscription> {
  const subscriptionCollection = getSubscriptionCollection();
  const filter = { chatId };
  return subscriptionCollection.findOne(filter);
}

export async function addSubscription(chatId: number): Promise<InsertOneResult<Subscription>> {
  const subscriptionCollection = getSubscriptionCollection();
  const subscription = {
    chatId,
    isActive: true,
    createdAt: new Date(),
  } as Subscription;
  return subscriptionCollection.insertOne(subscription);
}

export async function updateSubscription(chatId: number, toUpdate: Partial<Subscription>): Promise<void> {
  const subscriptionCollection = getSubscriptionCollection();
  const filter = { chatId };
  const updateObj = { $set: toUpdate };
  await subscriptionCollection.updateOne(filter, updateObj);
}
