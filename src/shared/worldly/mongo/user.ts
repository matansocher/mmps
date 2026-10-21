import { createUserRepository, getMongoCollection } from '@core/mongo';
import type { WorldlyLanguage } from '../types';
import { DB_NAME } from './constants';

export const { saveUserDetails, getUserDetails } = createUserRepository(DB_NAME);

export async function getUserLanguage(chatId: number): Promise<WorldlyLanguage> {
  const user = await getMongoCollection<{ readonly chatId: number; readonly language?: WorldlyLanguage }>(DB_NAME, 'User').findOne({ chatId });
  return user?.language === 'he' ? 'he' : 'en';
}

export async function setUserLanguage(chatId: number, language: WorldlyLanguage): Promise<void> {
  await getMongoCollection(DB_NAME, 'User').updateOne({ chatId }, { $set: { language }, $setOnInsert: { chatId, createdAt: new Date() } }, { upsert: true });
}
