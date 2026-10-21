import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreateMemoryData, Memory } from '../types';
import { COLLECTION_NAME, DB_NAME } from './constants';

const getCollection = () => getMongoCollection<Memory>(DB_NAME, COLLECTION_NAME);

function toObjectId(id: string | ObjectId): ObjectId | null {
  if (id instanceof ObjectId) return id;
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export async function ensureMemoryIndexes(): Promise<void> {
  await getCollection().createIndex({ chatId: 1, updatedAt: -1 });
}

// Newest first.
export async function getMemories(chatId: number, limit?: number): Promise<Memory[]> {
  const cursor = getCollection().find({ chatId }).sort({ updatedAt: -1, _id: -1 });
  return (limit ? cursor.limit(limit) : cursor).toArray();
}

export async function getMemoryById(id: string | ObjectId, chatId: number): Promise<Memory | null> {
  const _id = toObjectId(id);
  if (!_id) return null;
  return getCollection().findOne({ _id, chatId });
}

export async function findMemoryByContent(chatId: number, content: string): Promise<Memory | null> {
  const escaped = content.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return getCollection().findOne({ chatId, content: { $regex: `^${escaped}$`, $options: 'i' } });
}

export async function createMemory(data: CreateMemoryData): Promise<Memory> {
  const now = new Date();
  const memory = { chatId: data.chatId, content: data.content.trim(), createdAt: now, updatedAt: now };
  const { insertedId } = await getCollection().insertOne(memory as Memory);
  return { ...memory, _id: insertedId };
}

export async function updateMemory(id: string | ObjectId, chatId: number, content: string): Promise<boolean> {
  const _id = toObjectId(id);
  if (!_id) return false;
  const { matchedCount } = await getCollection().updateOne({ _id, chatId }, { $set: { content: content.trim(), updatedAt: new Date() } });
  return matchedCount > 0;
}

export async function deleteMemory(id: string | ObjectId, chatId: number): Promise<boolean> {
  const _id = toObjectId(id);
  if (!_id) return false;
  const { deletedCount } = await getCollection().deleteOne({ _id, chatId });
  return deletedCount > 0;
}

export async function deleteAllMemories(chatId: number): Promise<number> {
  const { deletedCount } = await getCollection().deleteMany({ chatId });
  return deletedCount;
}
