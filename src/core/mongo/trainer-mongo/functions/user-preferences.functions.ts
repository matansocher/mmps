import { ObjectId } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared/mongo-connection';
import { UserPreferences } from '../models';
import { COLLECTIONS, DB_NAME } from '../trainer-mongo.config';

export async function getUserPreference(chatId: number): Promise<UserPreferences> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<UserPreferences>(db, COLLECTIONS.USER_PREFERENCES);

  const filter = { chatId };
  return collection.findOne(filter);
}

export async function getActiveUsers(): Promise<UserPreferences[]> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<UserPreferences>(db, COLLECTIONS.USER_PREFERENCES);

  const filter = { isStopped: false };
  return collection.find(filter).toArray();
}

export async function createUserPreference(chatId: number): Promise<void> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<UserPreferences>(db, COLLECTIONS.USER_PREFERENCES);

  const userPreferences = await collection.findOne({ chatId });
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

  await collection.insertOne(userPreference);
}

export async function updateUserPreference(chatId: number, update: Partial<UserPreferences>): Promise<void> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<UserPreferences>(db, COLLECTIONS.USER_PREFERENCES);

  const filter = { chatId };
  const updateObj = { $set: update };
  await collection.updateOne(filter, updateObj);
}
