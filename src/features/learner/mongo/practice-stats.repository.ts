import { getMongoCollection } from '@core/mongo';
import { LEARNER_DB_NAME, LEARNER_PRACTICE_STATS_COLLECTION } from '../constants';
import type { PracticeQuestionStats } from '../types';

const getCollection = () => getMongoCollection<PracticeQuestionStats>(LEARNER_DB_NAME, LEARNER_PRACTICE_STATS_COLLECTION);

export const practiceStatsId = (telegramUserId: number, questionId: string) => `${telegramUserId}:${questionId}`;

export async function ensurePracticeStatsIndexes(): Promise<void> {
  await getCollection().createIndex({ telegramUserId: 1, dueAt: 1 });
}

export async function getPracticeStats(telegramUserId: number): Promise<PracticeQuestionStats[]> {
  return getCollection().find({ telegramUserId }).toArray();
}

export async function getPracticeQuestionStats(telegramUserId: number, questionId: string): Promise<PracticeQuestionStats | null> {
  return getCollection().findOne({ _id: practiceStatsId(telegramUserId, questionId) });
}

export async function savePracticeQuestionStats(stats: PracticeQuestionStats): Promise<void> {
  await getCollection().replaceOne({ _id: stats._id }, stats, { upsert: true });
}
