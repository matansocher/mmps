import { getMongoCollection } from '@core/mongo';
import type { WorldCupUser } from '../types';
import { DB_NAME, USERS_COLLECTION } from './constants';

function getCollection() {
  return getMongoCollection<WorldCupUser>(DB_NAME, USERS_COLLECTION);
}

export async function findUserByTelegramId(telegramUserId: number): Promise<WorldCupUser | null> {
  return getCollection().findOne({ telegramUserId });
}

export async function upsertUser(data: Omit<WorldCupUser, '_id' | 'createdAt'>): Promise<WorldCupUser> {
  const col = getCollection();
  const result = await col.findOneAndUpdate(
    { telegramUserId: data.telegramUserId },
    {
      $set: { chatId: data.chatId, firstName: data.firstName, lastName: data.lastName, username: data.username },
      $setOnInsert: { notificationsEnabled: data.notificationsEnabled, createdAt: new Date() },
    },
    { upsert: true, returnDocument: 'after' },
  );
  return result!;
}

export async function setNotifications(telegramUserId: number, enabled: boolean): Promise<void> {
  await getCollection().updateOne({ telegramUserId }, { $set: { notificationsEnabled: enabled } });
}

export async function findUsersWithNotifications(): Promise<WorldCupUser[]> {
  return getCollection().find({ notificationsEnabled: true }).toArray();
}

export async function findAllUsers(): Promise<WorldCupUser[]> {
  return getCollection().find({}).toArray();
}
