import type { Collection } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { STICKERS_DB_NAME, STICKERS_SEARCHES_COLLECTION } from '../constants';
import type { SearchEvent, StatCount } from '../types';

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

export async function getTopSearchWords(limit: number): Promise<StatCount[]> {
  return getCollection()
    .aggregate<StatCount>([
      { $unwind: '$words' },
      { $group: { _id: '$words', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit },
      { $project: { _id: 0, value: '$_id', count: 1 } },
    ])
    .toArray();
}

export async function getTopSearchers(limit: number): Promise<StatCount[]> {
  return getCollection()
    .aggregate<StatCount>([{ $group: { _id: '$phone', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: limit }, { $project: { _id: 0, value: '$_id', count: 1 } }])
    .toArray();
}
