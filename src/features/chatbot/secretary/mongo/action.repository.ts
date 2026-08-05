import { getMongoCollection } from '@core/mongo';
import { ACTIONS_COLLECTION, DB_NAME } from './constants';
import type { CreateSecretaryActionData, SecretaryAction, SecretaryActionStatus } from './types';

const getCollection = () => getMongoCollection<SecretaryAction>(DB_NAME, ACTIONS_COLLECTION);

export async function createActions(data: CreateSecretaryActionData[]): Promise<void> {
  if (data.length === 0) return;
  const now = new Date();
  const docs = data.map((d) => ({ ...d, status: 'pending', createdAt: now })) as SecretaryAction[];
  await getCollection().insertMany(docs);
}

export async function getActionByShortId(shortId: string): Promise<SecretaryAction | null> {
  return getCollection().findOne({ shortId });
}

export async function getActionsByMessageId(messageId: number): Promise<SecretaryAction[]> {
  return getCollection().find({ messageId }).toArray();
}

export async function setActionsMessageId(shortIds: string[], messageId: number): Promise<void> {
  if (shortIds.length === 0) return;
  await getCollection().updateMany({ shortId: { $in: shortIds } }, { $set: { messageId } });
}

export async function updateActionStatus(shortId: string, status: SecretaryActionStatus, result: string): Promise<void> {
  await getCollection().updateOne({ shortId }, { $set: { status, result, executedAt: new Date() } });
}
