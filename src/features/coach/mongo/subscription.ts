import { InsertOneResult } from 'mongodb';
import { Subscription } from '../types';
import { getCollection } from './connection';
import { COLLECTIONS } from './constants';

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const subscriptionCollection = await getCollection<Subscription>(COLLECTIONS.SUBSCRIPTION);
  const filter = { isActive: true };
  return subscriptionCollection.find(filter).toArray();
}

export async function getSubscription(chatId: number): Promise<Subscription> {
  const subscriptionCollection = await getCollection<Subscription>(COLLECTIONS.SUBSCRIPTION);
  const filter = { chatId };
  return subscriptionCollection.findOne(filter);
}

export async function addSubscription(chatId: number): Promise<InsertOneResult<Subscription>> {
  const subscriptionCollection = await getCollection<Subscription>(COLLECTIONS.SUBSCRIPTION);
  const subscription = {
    chatId,
    isActive: true,
    createdAt: new Date(),
  } as Subscription;
  return subscriptionCollection.insertOne(subscription);
}

export async function updateSubscription(chatId: number, toUpdate: Partial<Subscription>): Promise<void> {
  const subscriptionCollection = await getCollection<Subscription>(COLLECTIONS.SUBSCRIPTION);
  const filter = { chatId };
  const updateObj = { $set: toUpdate };
  await subscriptionCollection.updateOne(filter, updateObj);
}
