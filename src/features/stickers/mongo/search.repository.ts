import type { Collection } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { STICKERS_DB_NAME, STICKERS_SEARCHES_COLLECTION } from '../constants';
import type { SearchEvent } from '../types';

function getCollection(): Collection<SearchEvent> {
  return getMongoCollection<SearchEvent>(STICKERS_DB_NAME, STICKERS_SEARCHES_COLLECTION);
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
