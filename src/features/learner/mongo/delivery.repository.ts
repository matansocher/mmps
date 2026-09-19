import { MongoServerError } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { LEARNER_DB_NAME, LEARNER_DELIVERIES_COLLECTION, LEARNER_DELIVERY_TTL_DAYS } from '../constants';
import type { LearnerDelivery, LearnerRating } from '../types';

const getCollection = () => getMongoCollection<LearnerDelivery>(LEARNER_DB_NAME, LEARNER_DELIVERIES_COLLECTION);

export async function ensureLearnerDeliveryIndexes(): Promise<void> {
  const collection = getCollection();
  await collection.createIndex({ chatId: 1, dateKey: 1 });
  await collection.createIndex({ chatId: 1, messageId: 1 });
  // Records self-expire so deliveries don't accumulate forever.
  await collection.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
}

const deliveryId = (chatId: number, dateKey: string, slot: number) => `${chatId}:${dateKey}:${slot}`;

export async function getDeliveriesForDay(chatId: number, dateKey: string): Promise<LearnerDelivery[]> {
  return getCollection().find({ chatId, dateKey }).toArray();
}

export async function getDelivery(chatId: number, dateKey: string, slot: number): Promise<LearnerDelivery | null> {
  return getCollection().findOne({ _id: deliveryId(chatId, dateKey, slot) });
}

// Idempotently claim a slot for the day. Returns null only when another run already claimed it.
export async function claimSlot(chatId: number, dateKey: string, slot: number, biteId: string): Promise<LearnerDelivery | null> {
  const now = new Date();
  const expireAt = new Date(now.getTime() + LEARNER_DELIVERY_TTL_DAYS * 24 * 60 * 60 * 1000);
  const doc: LearnerDelivery = {
    _id: deliveryId(chatId, dateKey, slot),
    chatId,
    dateKey,
    slot,
    biteId,
    messageId: null,
    answered: false,
    rating: null,
    sentAt: now,
    answeredAt: null,
    expireAt,
  };
  try {
    await getCollection().insertOne(doc);
    return doc;
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) return null;
    throw err;
  }
}

export async function releaseClaimedSlot(chatId: number, dateKey: string, slot: number): Promise<void> {
  await getCollection().deleteOne({ _id: deliveryId(chatId, dateKey, slot), messageId: null });
}

export async function setDeliveryMessageId(chatId: number, dateKey: string, slot: number, messageId: number): Promise<void> {
  await getCollection().updateOne({ _id: deliveryId(chatId, dateKey, slot) }, { $set: { messageId } });
}

export async function markAnsweredByMessage(chatId: number, messageId: number, rating: LearnerRating): Promise<LearnerDelivery | null> {
  return getCollection().findOneAndUpdate(
    { chatId, messageId },
    { $set: { answered: true, rating, answeredAt: new Date() } },
    { returnDocument: 'after' },
  );
}
