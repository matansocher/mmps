import type { InsertOneResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreateSelfieEventData, SelfieEvent } from '../types';

export const DB_NAME = 'Selfie';

const getCollection = () => getMongoCollection<SelfieEvent>(DB_NAME, 'events');

export async function saveEvent(data: CreateSelfieEventData): Promise<InsertOneResult<SelfieEvent>> {
  const collection = getCollection();
  const document: Omit<SelfieEvent, '_id'> = {
    ...data,
    createdAt: new Date(),
  };
  return collection.insertOne(document as SelfieEvent);
}

export async function getEventsByConversationId(conversationId: string): Promise<SelfieEvent[]> {
  const collection = getCollection();
  return collection.find({ 'conversation.id': conversationId }).sort({ date: -1 }).toArray();
}

export async function getEventsBySenderId(senderId: string): Promise<SelfieEvent[]> {
  const collection = getCollection();
  return collection.find({ 'sender.id': senderId }).sort({ date: -1 }).toArray();
}

export async function getEventsByDate(date: string): Promise<SelfieEvent[]> {
  const collection = getCollection();
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  return collection
    .find({ date: { $gte: start, $lte: end } })
    .sort({ date: -1 })
    .toArray();
}

export async function searchEvents(query: string, limit = 50): Promise<SelfieEvent[]> {
  const collection = getCollection();
  return collection
    .find({ text: { $regex: query, $options: 'i' } })
    .sort({ date: -1 })
    .limit(limit)
    .toArray();
}

export async function getRecentEvents(limit: number): Promise<SelfieEvent[]> {
  const collection = getCollection();
  return collection.find().sort({ date: -1 }).limit(limit).toArray();
}
