import { getMongoCollection } from '@core/mongo';
import { LEARNER_DB_NAME, LEARNER_SUBSCRIPTIONS_COLLECTION } from '../constants';
import type { LearnerSubscription } from '../types';

const getCollection = () => getMongoCollection<LearnerSubscription>(LEARNER_DB_NAME, LEARNER_SUBSCRIPTIONS_COLLECTION);

export async function getSubscription(chatId: number): Promise<LearnerSubscription | null> {
  return getCollection().findOne({ _id: chatId });
}

export async function getActiveSubscriptions(): Promise<LearnerSubscription[]> {
  return getCollection().find({ isActive: true }).toArray();
}

export async function upsertSubscription(chatId: number, isActive: boolean): Promise<void> {
  const now = new Date();
  await getCollection().updateOne(
    { _id: chatId },
    { $set: { isActive, updatedAt: now }, $setOnInsert: { _id: chatId, createdAt: now } },
    { upsert: true },
  );
}
