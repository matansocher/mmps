import { createUserRepository, getMongoCollection } from '@core/mongo';
import type { ImageLanguage } from '@shared/image-card';
import { DB_NAME } from './constants';

export const { saveUserDetails } = createUserRepository(DB_NAME);

type RailUserLanguage = {
  readonly chatId: number;
  readonly language?: ImageLanguage;
};

const getCollection = () => getMongoCollection<RailUserLanguage>(DB_NAME, 'User');

// Returns null when the user never picked a language in /actions, so callers can fall back to per-message detection.
export async function getUserLanguagePreference(chatId: number): Promise<ImageLanguage | null> {
  const user = await getCollection().findOne({ chatId });
  return user?.language === 'he' || user?.language === 'en' ? user.language : null;
}

export async function setUserLanguagePreference(chatId: number, language: ImageLanguage): Promise<void> {
  await getCollection().updateOne({ chatId }, { $set: { language }, $setOnInsert: { chatId, createdAt: new Date() } }, { upsert: true });
}
