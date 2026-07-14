import type { Collection } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { DailyAttempt, DailyRoute } from '../types';
import { DAILY_ATTEMPTS_COLLECTION, DAILY_ROUTES_COLLECTION, DB_NAME } from './constants';

function getRoutesCollection(): Collection<DailyRoute> {
  return getMongoCollection<DailyRoute>(DB_NAME, DAILY_ROUTES_COLLECTION);
}

function getAttemptsCollection(): Collection<DailyAttempt> {
  return getMongoCollection<DailyAttempt>(DB_NAME, DAILY_ATTEMPTS_COLLECTION);
}

export async function getDailyRoute(israelDate: string): Promise<DailyRoute | null> {
  return getRoutesCollection().findOne({ israelDate });
}

export async function saveDailyRoute(route: DailyRoute): Promise<DailyRoute> {
  await getRoutesCollection().updateOne({ israelDate: route.israelDate }, { $setOnInsert: route }, { upsert: true });
  return (await getDailyRoute(route.israelDate))!;
}

export async function hasCompletedDailyAttempt(telegramUserId: number, israelDate: string): Promise<boolean> {
  return Boolean(await getAttemptsCollection().findOne({ telegramUserId, israelDate }, { projection: { _id: 1 } }));
}

export async function createDailyAttempt(attempt: DailyAttempt): Promise<boolean> {
  try {
    await getAttemptsCollection().insertOne(attempt);
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
}

export async function ensureDailyRouteIndexes(): Promise<void> {
  await Promise.all([
    getRoutesCollection().createIndex({ israelDate: 1 }, { unique: true }),
    getAttemptsCollection().createIndex({ telegramUserId: 1, israelDate: 1 }, { unique: true }),
    getAttemptsCollection().createIndex({ completedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 120 }),
  ]);
}
