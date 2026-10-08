import type { Collection, ObjectId } from 'mongodb';
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
    { key: { phone: 1, createdAt: -1 }, name: 'phone_created_at' },
  ]);
}

export type CreateSearchEventData = Omit<SearchEvent, '_id' | 'createdAt'>;

export async function recordSearchEvent(data: CreateSearchEventData): Promise<ObjectId> {
  const { insertedId } = await getCollection().insertOne({ ...data, createdAt: new Date() });
  return insertedId;
}

export async function getLatestSearchId(phone: string): Promise<ObjectId | null> {
  const latest = await getCollection().findOne({ phone }, { sort: { createdAt: -1 }, projection: { _id: 1 } });
  return latest?._id ?? null;
}

// Atomically moves the cursor past the page, so a double tap or an already-used button can't send the same page twice.
export async function claimSearchPage(id: ObjectId, phone: string, offset: number, nextOffset: number): Promise<SearchEvent | null> {
  return getCollection().findOneAndUpdate({ _id: id, phone, nextOffset: offset }, { $set: { nextOffset } }, { returnDocument: 'after' });
}

export type SearchPageResult = {
  readonly nextOffset: number;
  readonly sentIds: ObjectId[];
  readonly failed: number;
  readonly rateLimited: boolean;
};

export async function recordSearchPage(id: ObjectId, { nextOffset, sentIds, failed, rateLimited }: SearchPageResult): Promise<void> {
  await getCollection().updateOne({ _id: id }, { $set: { nextOffset, ...(rateLimited && { rateLimited: true }) }, $push: { sentStickerIds: { $each: sentIds } }, $inc: { failedCount: failed } });
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
