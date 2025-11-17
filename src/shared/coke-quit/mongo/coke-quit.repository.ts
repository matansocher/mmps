import type { Collection, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CokeQuitStats, CokeQuitTracker } from '../types';
import { DB_NAME } from './index';

function getCollection(): Collection<CokeQuitTracker> {
  return getMongoCollection<CokeQuitTracker>(DB_NAME, 'Tracking');
}

export async function getOrCreateTracker(chatId: number): Promise<CokeQuitTracker> {
  const collection = getCollection();
  const existing = await collection.findOne({ chatId, isActive: true });

  if (existing) {
    return existing;
  }

  const newTracker: Omit<CokeQuitTracker, '_id'> = {
    chatId,
    quitDate: new Date(),
    currentStreak: 0,
    longestStreak: 0,
    totalCokeFreeNights: 0,
    slips: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await collection.insertOne(newTracker as CokeQuitTracker);
  return { ...newTracker, _id: result.insertedId } as CokeQuitTracker;
}

export async function getTracker(chatId: number): Promise<CokeQuitTracker | null> {
  const collection = getCollection();
  return collection.findOne({ chatId, isActive: true });
}

export async function incrementStreak(chatId: number): Promise<UpdateResult> {
  const collection = getCollection();
  const tracker = await getTracker(chatId);

  if (!tracker) {
    throw new Error('Tracker not found');
  }

  const newStreak = tracker.currentStreak + 1;
  const newLongestStreak = Math.max(newStreak, tracker.longestStreak);

  return collection.updateOne(
    { chatId, isActive: true },
    {
      $set: {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        totalCokeFreeNights: tracker.totalCokeFreeNights + 1,
        updatedAt: new Date(),
      },
    },
  );
}

export async function recordSlip(chatId: number): Promise<UpdateResult> {
  const collection = getCollection();
  const tracker = await getTracker(chatId);

  if (!tracker) {
    throw new Error('Tracker not found');
  }

  return collection.updateOne(
    { chatId, isActive: true },
    {
      $set: {
        currentStreak: 0,
        updatedAt: new Date(),
      },
      $push: {
        slips: { date: new Date() },
      } as any,
    },
  );
}

export async function getStats(chatId: number): Promise<CokeQuitStats | null> {
  const tracker = await getTracker(chatId);

  if (!tracker) {
    return null;
  }

  const lastSlip = tracker.slips.length > 0 ? tracker.slips[tracker.slips.length - 1] : undefined;

  return {
    currentStreak: tracker.currentStreak,
    longestStreak: tracker.longestStreak,
    totalCokeFreeNights: tracker.totalCokeFreeNights,
    slipCount: tracker.slips.length,
    lastSlipDate: lastSlip?.date,
  };
}
