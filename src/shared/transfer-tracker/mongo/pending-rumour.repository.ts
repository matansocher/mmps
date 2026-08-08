import type { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreatePendingRumourData, PendingRumour } from '../types';
import { DB_NAME } from './constants';

function getCollection() {
  return getMongoCollection<PendingRumour>(DB_NAME, 'PendingRumour');
}

// Stores newly-collected rumours, skipping any already pending for the same
// rumour + report timestamp (collector retries, or a rumour that hasn't moved on).
export async function createPendingRumours(rumours: CreatePendingRumourData[]): Promise<void> {
  if (!rumours.length) {
    return;
  }
  const collection = getCollection();
  const collectedAt = new Date();
  const existing = await collection.find({ $or: rumours.map(({ rumourId, chatId, reportedAt }) => ({ rumourId, chatId, reportedAt })) }).toArray();
  const existingKeys = new Set(existing.map((rumour) => `${rumour.chatId}:${rumour.rumourId}:${rumour.reportedAt.getTime()}`));
  const newRumours = rumours.filter((rumour) => !existingKeys.has(`${rumour.chatId}:${rumour.rumourId}:${rumour.reportedAt.getTime()}`));
  if (!newRumours.length) {
    return;
  }
  await collection.insertMany(newRumours.map((rumour) => ({ ...rumour, collectedAt }) as PendingRumour));
}

export async function getPendingRumours(): Promise<PendingRumour[]> {
  return getCollection().find({}).sort({ reportedAt: 1 }).toArray();
}

export async function deletePendingRumours(ids: ObjectId[]): Promise<void> {
  if (!ids.length) {
    return;
  }
  await getCollection().deleteMany({ _id: { $in: ids } });
}
