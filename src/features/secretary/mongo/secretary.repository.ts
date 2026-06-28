import type { InsertOneResult } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME, MESSAGES_COLLECTION } from './constants';
import type { CreateSecretaryMessageData, SecretaryMessage } from './types';

const getCollection = () => getMongoCollection<SecretaryMessage>(DB_NAME, MESSAGES_COLLECTION);

export async function saveMessage(data: CreateSecretaryMessageData): Promise<InsertOneResult<SecretaryMessage>> {
  const message: Omit<SecretaryMessage, '_id'> = { ...data, createdAt: new Date() };
  return getCollection().insertOne(message as SecretaryMessage);
}

export async function getMessagesForChatBetween(chatId: number, from: Date, to: Date): Promise<SecretaryMessage[]> {
  return getCollection()
    .find({ chatId, createdAt: { $gte: from, $lt: to } })
    .sort({ createdAt: 1 })
    .toArray();
}

// Most recent messages for a chat (ascending by time), used to build smart-reply context.
export async function getRecentMessagesForChat(chatId: number, limit: number): Promise<SecretaryMessage[]> {
  const messages = await getCollection().find({ chatId }).sort({ createdAt: -1 }).limit(limit).toArray();
  return messages.reverse();
}

export async function getActiveChatIdsBetween(from: Date, to: Date): Promise<number[]> {
  const chatIds = await getCollection().distinct('chatId', { createdAt: { $gte: from, $lt: to } });
  return chatIds as number[];
}

export async function deleteMessagesBefore(cutoff: Date): Promise<number> {
  const result = await getCollection().deleteMany({ createdAt: { $lt: cutoff } });
  return result.deletedCount ?? 0;
}
