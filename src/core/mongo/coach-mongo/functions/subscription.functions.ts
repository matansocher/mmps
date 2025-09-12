import { InsertOneResult } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared/mongo-connection';
import { COLLECTIONS, DB_NAME } from '../coach-mongo.config';
import { Subscription } from '../models';

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const filter = { isActive: true };
  return collection.find(filter).toArray();
}

export async function getSubscription(chatId: number): Promise<Subscription> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const filter = { chatId };
  return collection.findOne(filter);
}

export async function addSubscription(chatId: number): Promise<InsertOneResult<Subscription>> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const subscription = {
    chatId,
    isActive: true,
    createdAt: new Date(),
  } as Subscription;
  return collection.insertOne(subscription);
}

export async function updateSubscription(chatId: number, toUpdate: Partial<Subscription>): Promise<void> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Subscription>(db, COLLECTIONS.SUBSCRIPTION);

  const filter = { chatId };
  const updateObj = { $set: toUpdate };
  await collection.updateOne(filter, updateObj);
}
