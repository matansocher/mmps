import { Collection, Db, ObjectId } from 'mongodb';
import { getMongoCollection, getMongoDb } from '@core/mongo/shared';
import { UserPreferences } from '../types';
import { COLLECTIONS, DB_NAME } from './constants';

let db: Db;
let userPreferencesCollection: Collection<UserPreferences>;

(async () => {
  db = await getMongoDb(DB_NAME);
  userPreferencesCollection = getMongoCollection<UserPreferences>(db, COLLECTIONS.USER_PREFERENCES);
})();

export async function getUserPreference(chatId: number): Promise<UserPreferences> {
  const filter = { chatId };
  return userPreferencesCollection.findOne(filter);
}

export async function getActiveUsers(): Promise<UserPreferences[]> {
  const filter = { isStopped: false };
  return userPreferencesCollection.find(filter).toArray();
}

export async function createUserPreference(chatId: number): Promise<void> {
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
}

export async function updateUserPreference(chatId: number, update: Partial<UserPreferences>): Promise<void> {
  const filter = { chatId };
  const updateObj = { $set: update };
  await userPreferencesCollection.updateOne(filter, updateObj);
}
