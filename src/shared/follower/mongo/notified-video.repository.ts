import type { InsertOneResult } from 'mongodb';

import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';

import type { NotifiedVideo, Platform } from '../types';
import { DB_NAME } from './index';

const logger = new Logger('notified-video.repository');

function getCollection() {
  return getMongoCollection<NotifiedVideo>(DB_NAME, 'notified_videos');
}

export async function isVideoNotified(chatId: number, videoId: string, platform: Platform): Promise<boolean> {
  try {
    const collection = getCollection();
    const count = await collection.countDocuments({ chatId, videoId, platform });
    return count > 0;
  } catch (err) {
    logger.error(`isVideoNotified - err: ${err}`);
    return false;
  }
}

export async function markVideoAsNotified(chatId: number, videoId: string, platform: Platform, videoUrl: string): Promise<InsertOneResult<NotifiedVideo>> {
  const collection = getCollection();
  const notifiedVideo: Omit<NotifiedVideo, '_id'> = {
    chatId,
    videoId,
    platform,
    videoUrl,
    notifiedAt: new Date(),
  };
  return collection.insertOne(notifiedVideo as NotifiedVideo);
}

export async function createIndexes(): Promise<void> {
  const collection = getCollection();
  await collection.createIndex({ chatId: 1, videoId: 1, platform: 1 }, { unique: true });
  await collection.createIndex({ notifiedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
}
