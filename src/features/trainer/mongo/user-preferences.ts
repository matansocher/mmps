import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { UserPreferences } from '../types';
import { DB_NAME } from './index';

const getCollection = () => getMongoCollection<UserPreferences>(DB_NAME, 'Exercise');

export async function getUserPreference(chatId: number): Promise<UserPreferences> {
  const userPreferencesCollection = getCollection();
  const filter = { chatId };
  return userPreferencesCollection.findOne(filter);
}

export async function getActiveUsers(): Promise<UserPreferences[]> {
  const userPreferencesCollection = getCollection();
  const filter = { isStopped: false };
  return userPreferencesCollection.find(filter).toArray();
}

export async function createUserPreference(chatId: number): Promise<void> {
  const userPreferencesCollection = getCollection();
  const userPreferences = await userPreferencesCollection.findOne({ chatId });
  if (userPreferences) {
    await updateUserPreference(chatId, { isStopped: false });
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
  const userPreferencesCollection = getCollection();
  const filter = { chatId };
  const updateObj = { $set: update };
  await userPreferencesCollection.updateOne(filter, updateObj);
  return;
}
