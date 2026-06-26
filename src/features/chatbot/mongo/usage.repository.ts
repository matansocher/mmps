import type { Collection, InsertOneResult } from 'mongodb';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getMongoCollection } from '@core/mongo';
import { USAGE_COLLECTION_NAME, USAGE_DB_NAME, USAGE_TTL_SECONDS } from './constants';
import type { AggregateUsageOptions, SaveUsageData, UsageAggregateRow, UsageRecord } from './types';

const getCollection = (): Collection<UsageRecord> => getMongoCollection<UsageRecord>(USAGE_DB_NAME, USAGE_COLLECTION_NAME);

export async function ensureUsageIndexes(): Promise<void> {
  const collection = getCollection();
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: USAGE_TTL_SECONDS });
  await collection.createIndex({ chatId: 1, createdAt: -1 });
}

export async function saveUsageRecord(data: SaveUsageData): Promise<InsertOneResult<UsageRecord>> {
  const collection = getCollection();
  const record: Omit<UsageRecord, '_id'> = { ...data, createdAt: new Date() };
  return collection.insertOne(record as UsageRecord);
}

export async function aggregateUsage(options: AggregateUsageOptions = {}): Promise<UsageAggregateRow[]> {
  const collection = getCollection();
  const match: Record<string, unknown> = {};
  if (options.chatId !== undefined) match.chatId = options.chatId;
  if (options.from || options.to) {
    match.createdAt = {
      ...(options.from ? { $gte: options.from } : {}),
      ...(options.to ? { $lte: options.to } : {}),
    };
  }

  return collection
    .aggregate<UsageAggregateRow>([
      { $match: match },
      {
        $group: {
          _id: {
            chatId: '$chatId',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: DEFAULT_TIMEZONE } },
          },
          turns: { $sum: 1 },
          tokensTotal: { $sum: '$tokensTotal' },
          cost: { $sum: '$cost' },
        },
      },
      {
        $project: {
          _id: 0,
          chatId: '$_id.chatId',
          day: '$_id.day',
          turns: 1,
          tokensTotal: 1,
          cost: 1,
        },
      },
      { $sort: { day: -1, chatId: 1 } },
    ])
    .toArray();
}
