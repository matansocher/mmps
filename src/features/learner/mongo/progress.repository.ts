import type { Collection } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME, PROGRESS_COLLECTION } from './constants';
import type { LearnerProgress, ReadMap } from './types';

const getCollection = (): Collection<LearnerProgress> => getMongoCollection<LearnerProgress>(DB_NAME, PROGRESS_COLLECTION);

export async function getProgress(chatId: number): Promise<ReadMap> {
  const doc = await getCollection().findOne({ chatId });
  return doc?.courses ?? {};
}

export async function saveCourseProgress(chatId: number, courseId: string, lessonIds: string[]): Promise<void> {
  await getCollection().updateOne({ chatId }, { $set: { [`courses.${courseId}`]: lessonIds, updatedAt: new Date() } }, { upsert: true });
}
