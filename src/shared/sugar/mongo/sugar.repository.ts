import type { InsertOneResult, ObjectId, UpdateResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from '.';
import type { CreateSugarSessionData, SugarReading, SugarSession, SugarSessionMetrics } from '../types';

const getCollection = () => getMongoCollection<SugarSession>(DB_NAME, 'SugarSessions');

export async function createSession(data: CreateSugarSessionData): Promise<InsertOneResult<SugarSession>> {
  const collection = getCollection();
  const session: Omit<SugarSession, '_id'> = {
    chatId: data.chatId,
    startedAt: new Date(),
    mealDescription: data.mealDescription,
    foods: data.foods || [],
    mealType: data.mealType,
    readings: [],
    tags: data.tags,
  };

  return collection.insertOne(session as SugarSession);
}

export async function getActiveSession(chatId: number): Promise<SugarSession | null> {
  const collection = getCollection();
  return collection.findOne({ chatId, closedAt: { $exists: false } }, { sort: { startedAt: -1 } });
}

export async function getSessionById(id: string | ObjectId, chatId: number): Promise<SugarSession | null> {
  const collection = getCollection();
  const { ObjectId } = await import('mongodb');
  return collection.findOne({ _id: new ObjectId(id), chatId });
}

export async function addReading(sessionId: string | ObjectId, reading: SugarReading): Promise<UpdateResult> {
  const collection = getCollection();
  const { ObjectId } = await import('mongodb');
  return collection.updateOne({ _id: new ObjectId(sessionId) }, { $push: { readings: reading } });
}

export async function closeSession(sessionId: string | ObjectId): Promise<UpdateResult> {
  const collection = getCollection();
  const { ObjectId } = await import('mongodb');
  return collection.updateOne({ _id: new ObjectId(sessionId) }, { $set: { closedAt: new Date() } });
}

export async function updateSessionNotes(sessionId: string | ObjectId, notes: string): Promise<UpdateResult> {
  const collection = getCollection();
  const { ObjectId } = await import('mongodb');
  return collection.updateOne({ _id: new ObjectId(sessionId) }, { $set: { notes } });
}

export async function getSessionsByFood(chatId: number, food: string): Promise<SugarSession[]> {
  const collection = getCollection();
  const regex = new RegExp(food, 'i');
  return collection
    .find({
      chatId,
      closedAt: { $exists: true },
      $or: [{ foods: { $elemMatch: { $regex: regex } } }, { mealDescription: { $regex: regex } }],
    })
    .sort({ startedAt: -1 })
    .toArray();
}

export async function getSessionsByDateRange(chatId: number, start: Date, end: Date): Promise<SugarSession[]> {
  const collection = getCollection();
  return collection
    .find({
      chatId,
      startedAt: { $gte: start, $lte: end },
    })
    .sort({ startedAt: -1 })
    .toArray();
}

export async function getAllSessions(chatId: number, limit = 50): Promise<SugarSession[]> {
  const collection = getCollection();
  return collection.find({ chatId }).sort({ startedAt: -1 }).limit(limit).toArray();
}

export async function getRecentSessions(chatId: number, limit = 10): Promise<SugarSession[]> {
  const collection = getCollection();
  return collection.find({ chatId, closedAt: { $exists: true } }).sort({ startedAt: -1 }).limit(limit).toArray();
}

export function calculateSessionMetrics(session: SugarSession): SugarSessionMetrics {
  const readings = session.readings;

  if (readings.length === 0) {
    return { peakValue: 0, peakTime: 0, baselineValue: null, delta: null, readingCount: 0 };
  }

  const baselineReading = readings.find((r) => r.minutesAfterMeal === 0);
  const baselineValue = baselineReading?.value ?? null;

  const peakReading = readings.reduce((max, r) => (r.value > max.value ? r : max), readings[0]);
  const peakValue = peakReading.value;
  const peakTime = peakReading.minutesAfterMeal;

  const delta = baselineValue !== null ? peakValue - baselineValue : null;

  return {
    peakValue,
    peakTime,
    baselineValue,
    delta,
    readingCount: readings.length,
  };
}
