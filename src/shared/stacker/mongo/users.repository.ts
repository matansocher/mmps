import { getMongoCollection } from '@core/mongo';
import { DAILY_HEARTS, DEFAULT_NOTIFICATION_HOUR, StackerUser } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<StackerUser>(DB_NAME, 'Users');

export async function getStackerUser(chatId: number): Promise<StackerUser | null> {
  return getCollection().findOne({ chatId });
}

export async function upsertStackerUser(chatId: number, telegramUserId: number, username?: string): Promise<StackerUser> {
  const collection = getCollection();
  const existing = await collection.findOne({ chatId });
  if (existing) return existing;

  const user: StackerUser = {
    chatId,
    telegramUserId,
    username,
    xp: 0,
    streakCount: 0,
    heartsRemaining: DAILY_HEARTS,
    notificationHour: DEFAULT_NOTIFICATION_HOUR,
    notificationsEnabled: true,
    skillLevels: {},
    createdAt: new Date(),
  };
  await collection.insertOne(user);
  return user;
}

export async function updateStackerUser(chatId: number, update: Partial<StackerUser>): Promise<void> {
  await getCollection().updateOne({ chatId }, { $set: update });
}

export async function findUsersForReminder(hour: number): Promise<StackerUser[]> {
  return getCollection().find({ notificationHour: hour, notificationsEnabled: true }).toArray();
}
