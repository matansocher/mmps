import { getMongoCollection } from '@core/mongo';
import type { SentRumour } from '../types';
import { DB_NAME, SENT_RUMOUR_TTL_SECONDS } from './constants';

function getCollection() {
  return getMongoCollection<SentRumour>(DB_NAME, 'SentRumour');
}

export async function ensureTransferTrackerIndexes(): Promise<void> {
  const collection = getCollection();
  await collection.createIndex({ chatId: 1, rumourId: 1, status: 1 }, { unique: true });
  await collection.createIndex({ completedAt: 1 }, { expireAfterSeconds: SENT_RUMOUR_TTL_SECONDS });
}

// Keys, as `rumourId:status`, of the stages already announced for this chat.
// A rumour that moves to a new status is absent from this set, so it is newsworthy again.
export async function getSentRumourKeys(chatId: number): Promise<Set<string>> {
  const sent = await getCollection().find({ chatId }, { projection: { rumourId: 1, status: 1 } }).toArray();
  return new Set(sent.map((rumour) => `${rumour.rumourId}:${rumour.status}`));
}

export async function recordSentRumours(rumours: readonly Pick<SentRumour, 'chatId' | 'rumourId' | 'status'>[]): Promise<void> {
  if (!rumours.length) {
    return;
  }
  const completedAt = new Date();
  await getCollection().bulkWrite(
    rumours.map(({ chatId, rumourId, status }) => ({
      updateOne: { filter: { chatId, rumourId, status }, update: { $set: { completedAt } }, upsert: true },
    })),
  );
}
