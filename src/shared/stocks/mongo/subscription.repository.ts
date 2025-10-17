import { InsertOneResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from '.';
import { Subscription } from '../types';

const getCollection = () => getMongoCollection<Subscription>(DB_NAME, 'Subscription');

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const subscriptionCollection = getCollection();
  const filter = { isActive: true };
  return subscriptionCollection.find(filter).toArray();
}

export async function getSubscription(chatId: number): Promise<Subscription> {
  const subscriptionCollection = getCollection();
  const filter = { chatId };
  return subscriptionCollection.findOne(filter);
}

export async function addSubscription(chatId: number): Promise<InsertOneResult<Subscription>> {
  const subscriptionCollection = getCollection();
  const subscription = {
    chatId,
    isActive: true,
    createdAt: new Date(),
  } as Subscription;
  return subscriptionCollection.insertOne(subscription);
}

export async function updateSubscription(chatId: number, toUpdate: Partial<Subscription>): Promise<void> {
  const subscriptionCollection = getCollection();
  const filter = { chatId };
  const updateObj = { $set: toUpdate };
  await subscriptionCollection.updateOne(filter, updateObj);
}
