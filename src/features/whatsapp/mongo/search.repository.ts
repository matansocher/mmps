import type { Collection } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { WHATSAPP_DB_NAME, WHATSAPP_SEARCHES_COLLECTION } from '../constants';
import type { SearchEvent } from '../types';

function getCollection(): Collection<SearchEvent> {
  return getMongoCollection<SearchEvent>(WHATSAPP_DB_NAME, WHATSAPP_SEARCHES_COLLECTION);
}

export async function ensureSearchIndexes(): Promise<void> {
  await getCollection().createIndexes([
    { key: { createdAt: -1 }, name: 'created_at' },
    { key: { words: 1, createdAt: -1 }, name: 'words_created_at' },
  ]);
}

export type CreateSearchEventData = Omit<SearchEvent, '_id' | 'createdAt'>;

export async function recordSearchEvent(data: CreateSearchEventData): Promise<void> {
  await getCollection().insertOne({ ...data, createdAt: new Date() });
}
