import { getMongoCollection } from '@core/mongo';
import { DB_NAME, DRAFTS_COLLECTION } from './constants';
import type { CreateSecretaryDraftData, SecretaryDraft, SecretaryDraftStatus } from './types';

const getCollection = () => getMongoCollection<SecretaryDraft>(DB_NAME, DRAFTS_COLLECTION);

export async function createDraft(data: CreateSecretaryDraftData): Promise<void> {
  const doc: Omit<SecretaryDraft, '_id'> = { ...data, status: 'pending', createdAt: new Date() };
  await getCollection().insertOne(doc as SecretaryDraft);
}

export async function getDraftByShortId(shortId: string): Promise<SecretaryDraft | null> {
  return getCollection().findOne({ shortId });
}

export async function setDraftMessageId(shortId: string, messageId: number): Promise<void> {
  await getCollection().updateOne({ shortId }, { $set: { messageId } });
}

export async function updateDraftStatus(shortId: string, status: SecretaryDraftStatus): Promise<void> {
  const set: { status: SecretaryDraftStatus; sentAt?: Date } = { status };
  if (status === 'sent') set.sentAt = new Date();
  await getCollection().updateOne({ shortId }, { $set: set });
}

// Mark all still-pending drafts for a chat as superseded and return them (to clean up their buttons).
export async function supersedePendingDraftsForChat(chatId: number): Promise<SecretaryDraft[]> {
  const pending = await getCollection().find({ chatId, status: 'pending' }).toArray();
  if (pending.length === 0) return [];
  await getCollection().updateMany({ chatId, status: 'pending' }, { $set: { status: 'superseded' } });
  return pending;
}
