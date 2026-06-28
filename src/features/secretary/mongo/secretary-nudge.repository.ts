import { getMongoCollection } from '@core/mongo';
import { DB_NAME, NUDGES_COLLECTION } from './constants';
import type { CreateSecretaryNudgeData, SecretaryNudge, SecretaryNudgeStatus } from './types';

const getCollection = () => getMongoCollection<SecretaryNudge>(DB_NAME, NUDGES_COLLECTION);

export async function createNudge(data: CreateSecretaryNudgeData): Promise<void> {
  const doc: Omit<SecretaryNudge, '_id'> = { ...data, status: 'pending', createdAt: new Date() };
  await getCollection().insertOne(doc as SecretaryNudge);
}

export async function getNudgeByShortId(shortId: string): Promise<SecretaryNudge | null> {
  return getCollection().findOne({ shortId });
}

export async function setNudgeMessageId(shortId: string, messageId: number): Promise<void> {
  await getCollection().updateOne({ shortId }, { $set: { messageId } });
}

export async function updateNudgeStatus(shortId: string, status: SecretaryNudgeStatus): Promise<void> {
  await getCollection().updateOne({ shortId }, { $set: { status } });
}

// Mark all still-pending nudges for a chat as superseded and return them (to clean up their buttons).
export async function supersedePendingNudgesForChat(chatId: number): Promise<SecretaryNudge[]> {
  const pending = await getCollection().find({ chatId, status: 'pending' }).toArray();
  if (pending.length === 0) return [];
  await getCollection().updateMany({ chatId, status: 'pending' }, { $set: { status: 'superseded' } });
  return pending;
}
