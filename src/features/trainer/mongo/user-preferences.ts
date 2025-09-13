import { ObjectId } from 'mongodb';
import { UserPreferences } from '../types';
import { getCollection } from './connection';
import { COLLECTIONS } from './constants';

export async function getUserPreference(chatId: number): Promise<UserPreferences> {
  const userPreferencesCollection = await getCollection<UserPreferences>(COLLECTIONS.USER_PREFERENCES);
  const filter = { chatId };
  return userPreferencesCollection.findOne(filter);
}

export async function getActiveUsers(): Promise<UserPreferences[]> {
  const userPreferencesCollection = await getCollection<UserPreferences>(COLLECTIONS.USER_PREFERENCES);
  const filter = { isStopped: false };
  return userPreferencesCollection.find(filter).toArray();
}

export async function createUserPreference(chatId: number): Promise<void> {
  const userPreferencesCollection = await getCollection<UserPreferences>(COLLECTIONS.USER_PREFERENCES);
  const userPreferences = await userPreferencesCollection.findOne({ chatId });
  if (userPreferences) {
    await this.updateUserPreference(chatId, { isStopped: false });
    return;
  }

  const userPreference = {
    _id: new ObjectId(),
    chatId,
    isStopped: false,
    createdAt: new Date(),
  };
  await userPreferencesCollection.insertOne(userPreference);
  return;
}

export async function updateUserPreference(chatId: number, update: Partial<UserPreferences>): Promise<void> {
  const userPreferencesCollection = await getCollection<UserPreferences>(COLLECTIONS.USER_PREFERENCES);
  const filter = { chatId };
  const updateObj = { $set: update };
  await userPreferencesCollection.updateOne(filter, updateObj);
  return;
}
