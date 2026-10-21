import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { ImageLanguage } from '@shared/image-card';
import { DB_NAME, WAKE_ALERTS_COLLECTION } from './constants';

export type WakeAlertStatus = 'pending' | 'sent' | 'cancelled' | 'expired';

export type WakeAlert = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly language: ImageLanguage;
  readonly fromStationId: number;
  readonly toStationId: number;
  readonly date: string; // Format: "YYYY-MM-DD" (departure date)
  readonly departureTime: string; // Format: "HH:mm"
  readonly trainNumbers: readonly number[];
  readonly scheduledArrivalAt: Date;
  readonly delayMinutes: number;
  readonly notifyAt: Date;
  readonly status: WakeAlertStatus;
  readonly lastCheckedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt?: Date;
};

export type CreateWakeAlertData = Omit<WakeAlert, '_id' | 'status' | 'createdAt' | 'lastCheckedAt' | 'updatedAt'>;

// Finished alerts are kept for a week for debugging and then removed by Mongo.
const ALERT_TTL_SECONDS = 7 * 24 * 60 * 60;

const getCollection = () => getMongoCollection<WakeAlert>(DB_NAME, WAKE_ALERTS_COLLECTION);

export async function ensureWakeAlertIndexes(): Promise<void> {
  const collection = getCollection();
  await collection.createIndex({ status: 1, notifyAt: 1 });
  await collection.createIndex({ scheduledArrivalAt: 1 }, { expireAfterSeconds: ALERT_TTL_SECONDS });
}

// One pending alert per chat and train: setting it again just refreshes the existing alert.
export async function upsertWakeAlert(data: CreateWakeAlertData): Promise<ObjectId> {
  const { chatId, date, departureTime, fromStationId, toStationId } = data;
  const result = await getCollection().findOneAndUpdate(
    { chatId, date, departureTime, fromStationId, toStationId, status: 'pending' },
    { $set: { ...data, updatedAt: new Date() }, $setOnInsert: { status: 'pending', createdAt: new Date() } },
    { upsert: true, returnDocument: 'after' },
  );
  return result._id;
}

export async function getPendingWakeAlertsDueBy(dueBy: Date): Promise<WakeAlert[]> {
  return getCollection().find({ status: 'pending', notifyAt: { $lte: dueBy } }).toArray();
}

export async function updateWakeAlertTiming(id: ObjectId, delayMinutes: number, notifyAt: Date): Promise<void> {
  await getCollection().updateOne({ _id: id, status: 'pending' }, { $set: { delayMinutes, notifyAt, lastCheckedAt: new Date(), updatedAt: new Date() } });
}

// Atomically moves a pending alert to a final status. Returns false when it was already handled.
export async function finishWakeAlert(id: ObjectId, status: Exclude<WakeAlertStatus, 'pending'>, chatId?: number): Promise<boolean> {
  const filter = { _id: id, status: 'pending' as const, ...(chatId ? { chatId } : {}) };
  const result = await getCollection().updateOne(filter, { $set: { status, updatedAt: new Date() } });
  return result.modifiedCount > 0;
}
