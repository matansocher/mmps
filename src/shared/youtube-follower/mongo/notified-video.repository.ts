import type { InsertOneResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import type { NotifiedVideo } from '../types';
import { DB_NAME } from './index';

const logger = new Logger('notified-video.repository');

function getCollection() {
  return getMongoCollection<NotifiedVideo>(DB_NAME, 'NotifiedVideo');
}

export async function getNotifiedVideoIds(): Promise<Set<string>> {
  try {
    const collection = getCollection();
    const notifiedVideos = await collection.find({}, { projection: { videoId: 1 } }).toArray();
    return new Set(notifiedVideos.map((video) => video.videoId));
  } catch (err) {
    logger.error(`getNotifiedVideoIds - err: ${err}`);
    return new Set();
  }
}

export async function markVideoAsNotified(videoId: string, videoUrl: string): Promise<InsertOneResult<NotifiedVideo>> {
  const collection = getCollection();
  const notifiedVideo: Omit<NotifiedVideo, '_id'> = {
    videoId,
    videoUrl,
    notifiedAt: new Date(),
  };
  return collection.insertOne(notifiedVideo as NotifiedVideo);
}

export async function createIndexes(): Promise<void> {
  const collection = getCollection();
  await collection.createIndex({ videoId: 1 }, { unique: true });
  await collection.createIndex({ notifiedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
}
