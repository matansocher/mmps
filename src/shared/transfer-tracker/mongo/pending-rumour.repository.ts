import type { AnyBulkWriteOperation, ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreatePendingRumourData, PendingRumour } from '../types';
import { DB_NAME, MAX_DIGEST_SENDS } from './constants';
import { recordSentRumours } from './sent-rumour.repository';

function getCollection() {
  return getMongoCollection<PendingRumour>(DB_NAME, 'PendingRumour');
}

// Stores the latest snapshot of each collected rumour, one document per rumour.
// A rumour that is re-reported refreshes the existing document instead of queueing a
// duplicate; when it reaches a new status its appearance counter restarts so the new
// stage gets its own run of digests.
export async function upsertPendingRumours(rumours: CreatePendingRumourData[]): Promise<void> {
  if (!rumours.length) {
    return;
  }
  const collection = getCollection();
  const collectedAt = new Date();
  const existing = await collection.find({ $or: rumours.map(({ chatId, rumourId }) => ({ chatId, rumourId })) }).toArray();
  const existingByKey = new Map(existing.map((rumour) => [`${rumour.chatId}:${rumour.rumourId}`, rumour]));

  const operations: AnyBulkWriteOperation<PendingRumour>[] = rumours.map((rumour) => {
    const previous = existingByKey.get(`${rumour.chatId}:${rumour.rumourId}`);
    const isNewStage = !previous || previous.status !== rumour.status;
    return {
      updateOne: {
        filter: { chatId: rumour.chatId, rumourId: rumour.rumourId },
        update: { $set: { ...rumour, collectedAt, ...(isNewStage ? { sentCount: 0 } : {}) } },
        upsert: true,
      },
    };
  });
  await collection.bulkWrite(operations);
}

export async function getPendingRumours(): Promise<PendingRumour[]> {
  return getCollection().find({}).sort({ reportedAt: 1 }).toArray();
}

// Counts one digest appearance for each rumour. Those that have had their full run are
// retired: remembered so they are never re-announced, then removed from the queue.
export async function markPendingRumoursSent(rumours: readonly PendingRumour[]): Promise<void> {
  if (!rumours.length) {
    return;
  }
  const retired = rumours.filter((rumour) => rumour.sentCount + 1 >= MAX_DIGEST_SENDS);
  const remaining = rumours.filter((rumour) => rumour.sentCount + 1 < MAX_DIGEST_SENDS);

  if (remaining.length) {
    const ids = remaining.map((rumour) => rumour._id).filter(Boolean) as ObjectId[];
    await getCollection().updateMany({ _id: { $in: ids } }, { $inc: { sentCount: 1 } });
  }
  if (retired.length) {
    await recordSentRumours(retired.map(({ chatId, rumourId, status }) => ({ chatId, rumourId, status })));
    const ids = retired.map((rumour) => rumour._id).filter(Boolean) as ObjectId[];
    await getCollection().deleteMany({ _id: { $in: ids } });
  }
}
