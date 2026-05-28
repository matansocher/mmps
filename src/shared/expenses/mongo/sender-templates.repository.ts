import { getMongoCollection } from '@core/mongo';
import { DB_NAME, SENDER_TEMPLATES_COLLECTION } from '../constants';
import type { SenderTemplate } from '../types';

const getCollection = () => getMongoCollection<SenderTemplate>(DB_NAME, SENDER_TEMPLATES_COLLECTION);

function normalizeFrom(from: string): string {
  const match = from.match(/<([^>]+)>/);
  const email = (match ? match[1] : from).trim().toLowerCase();
  return email;
}

export async function ensureSenderTemplateIndexes(): Promise<void> {
  const col = getCollection();
  await col.createIndex({ from: 1 }, { unique: true });
}

export async function getSenderTemplate(from: string): Promise<SenderTemplate | null> {
  const col = getCollection();
  return col.findOne({ from: normalizeFrom(from) });
}

export async function bumpSenderTemplate(from: string): Promise<void> {
  const col = getCollection();
  const normalized = normalizeFrom(from);
  await col.updateOne(
    { from: normalized },
    {
      $inc: { successCount: 1 },
      $set: { lastUpdated: new Date() },
      $setOnInsert: { from: normalized, hint: '' } as Partial<SenderTemplate>,
    },
    { upsert: true },
  );
}

export async function setSenderTemplateHint(from: string, hint: string): Promise<void> {
  const col = getCollection();
  await col.updateOne(
    { from: normalizeFrom(from) },
    { $set: { hint, lastUpdated: new Date() } },
    { upsert: true },
  );
}

export { normalizeFrom };
