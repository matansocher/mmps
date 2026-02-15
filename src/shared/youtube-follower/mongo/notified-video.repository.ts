import type { InsertOneResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import type { NotifiedVideo } from '../types';
import { DB_NAME } from './constants';

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
