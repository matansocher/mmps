import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from './selfie-event.repository';
import type { CreateSelfieDailyStat, SelfieDailyStat } from '../types';

const getCollection = () => getMongoCollection<SelfieDailyStat>(DB_NAME, 'DailyStats');

// Persist per-conversation message counts for a day. Idempotent per (date, conversationId).
export async function saveDailyStats(stats: CreateSelfieDailyStat[]): Promise<void> {
  if (stats.length === 0) return;
  const collection = getCollection();
  await collection.bulkWrite(
    stats.map((stat) => ({
      updateOne: {
        filter: { date: stat.date, conversationId: stat.conversationId },
        update: { $set: { conversationName: stat.conversationName, type: stat.type, count: stat.count }, $setOnInsert: { createdAt: new Date() } },
        upsert: true,
      },
    })),
  );
}

export async function getDailyStats(date: string): Promise<SelfieDailyStat[]> {
  return getCollection().find({ date }).sort({ count: -1 }).toArray();
}
