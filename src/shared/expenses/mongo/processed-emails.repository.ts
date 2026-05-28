import { getMongoCollection } from '@core/mongo';
import { DB_NAME, PROCESSED_EMAILS_COLLECTION } from '../constants';
import type { ProcessedEmail, ProcessedEmailStatus } from '../types';

const getCollection = () => getMongoCollection<ProcessedEmail>(DB_NAME, PROCESSED_EMAILS_COLLECTION);

export async function ensureProcessedEmailIndexes(): Promise<void> {
  const col = getCollection();
  await col.createIndex({ messageId: 1 }, { unique: true });
  await col.createIndex({ processedAt: -1 });
}

export async function isEmailProcessed(messageId: string): Promise<boolean> {
  const col = getCollection();
  const found = await col.findOne({ messageId }, { projection: { _id: 1 } });
  return !!found;
}

export async function markEmailProcessed(messageId: string, status: ProcessedEmailStatus, errorMessage?: string): Promise<void> {
  const col = getCollection();
  await col.updateOne(
    { messageId },
    { $set: { messageId, status, errorMessage, processedAt: new Date() } as ProcessedEmail },
    { upsert: true },
  );
}

export async function getProcessedMessageIds(messageIds: string[]): Promise<Set<string>> {
  if (messageIds.length === 0) return new Set();
  const col = getCollection();
  const docs = await col.find({ messageId: { $in: messageIds } }, { projection: { messageId: 1 } }).toArray();
  return new Set(docs.map((d) => d.messageId));
}
