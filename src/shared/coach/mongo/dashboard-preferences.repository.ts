import { randomBytes } from 'node:crypto';
import { getMongoCollection } from '@core/mongo';
import type { DashboardPreferences, DashboardPreferencesUpdate } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<DashboardPreferences>(DB_NAME, 'DashboardPreferences');

export async function getDashboardPreferences(telegramUserId: number): Promise<DashboardPreferences | null> {
  return getCollection().findOne({ telegramUserId });
}

export async function saveDashboardPreferences(telegramUserId: number, update: DashboardPreferencesUpdate): Promise<DashboardPreferences> {
  const now = new Date();
  return getCollection().findOneAndUpdate({ telegramUserId }, { $set: { ...update, updatedAt: now }, $setOnInsert: { telegramUserId, createdAt: now } }, { upsert: true, returnDocument: 'after' });
}

export async function getOrCreateDashboardAccessToken(telegramUserId: number, defaults: DashboardPreferencesUpdate): Promise<string> {
  const existing = await getDashboardPreferences(telegramUserId);
  if (existing?.accessToken) return existing.accessToken;
  const accessToken = randomBytes(24).toString('base64url');
  const now = new Date();
  await getCollection().updateOne({ telegramUserId }, { $set: { accessToken, updatedAt: now }, $setOnInsert: { telegramUserId, ...defaults, createdAt: now } }, { upsert: true });
  return accessToken;
}

export async function findDashboardUserByAccessToken(accessToken: string): Promise<number | null> {
  const doc = await getCollection().findOne({ accessToken }, { projection: { telegramUserId: 1 } });
  return doc?.telegramUserId ?? null;
}
