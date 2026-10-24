import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME, EMAIL_EVENTS_COLLECTION } from './constants';
import type { CreateEmailEventData, EmailEvent, EmailEventStatus } from './types';

const RETENTION_SECONDS = 30 * 24 * 60 * 60;

const getCollection = () => getMongoCollection<EmailEvent>(DB_NAME, EMAIL_EVENTS_COLLECTION);

export async function ensureEmailEventIndexes(): Promise<void> {
  const collection = getCollection();
  await collection.createIndex({ emailId: 1 }, { unique: true });
  await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });
}

export async function getScannedEmailIds(emailIds: ReadonlyArray<string>): Promise<Set<string>> {
  if (!emailIds.length) return new Set();
  const docs = await getCollection()
    .find({ emailId: { $in: [...emailIds] } }, { projection: { emailId: 1 } })
    .toArray();
  return new Set(docs.map((doc) => doc.emailId));
}

// Returns the inserted docs' ids keyed by emailId; already-scanned emails (duplicate key) are skipped.
export async function saveEmailEvents(data: ReadonlyArray<CreateEmailEventData>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  if (!data.length) return ids;
  const createdAt = new Date();
  const docs = data.map((d) => ({ ...d, _id: new ObjectId(), createdAt }) as EmailEvent);
  try {
    await getCollection().insertMany(docs, { ordered: false });
    docs.forEach((doc) => ids.set(doc.emailId, doc._id.toHexString()));
  } catch (err) {
    const failedIndexes = new Set<number>((err?.writeErrors ?? []).map((writeError: { index: number }) => writeError.index));
    if (!failedIndexes.size) throw err;
    docs.forEach((doc, index) => !failedIndexes.has(index) && ids.set(doc.emailId, doc._id.toHexString()));
  }
  return ids;
}

export async function getEmailEventById(id: string): Promise<EmailEvent | null> {
  if (!ObjectId.isValid(id)) return null;
  return getCollection().findOne({ _id: new ObjectId(id) });
}

export async function setEmailEventMessageId(id: string, messageId: number): Promise<void> {
  await getCollection().updateOne({ _id: new ObjectId(id) }, { $set: { messageId } });
}

// Atomically moves a pending suggestion to processing so a double tap can't add the event twice.
export async function claimEmailEvent(id: string): Promise<EmailEvent | null> {
  if (!ObjectId.isValid(id)) return null;
  return getCollection().findOneAndUpdate({ _id: new ObjectId(id), status: 'pending' }, { $set: { status: 'processing' } }, { returnDocument: 'after' });
}

export async function resolveEmailEvent(id: string, status: EmailEventStatus, calendarEventId?: string): Promise<void> {
  const update = status === 'pending' ? { status } : { status, resolvedAt: new Date(), ...(calendarEventId ? { calendarEventId } : {}) };
  await getCollection().updateOne({ _id: new ObjectId(id) }, { $set: update });
}
