import { getMongoCollection } from '@core/mongo';
import { emptyCloudJourney, mergeJourney } from '@shared/rewind';
import type { CloudJourney, SyncRequest, SyncResult } from '@shared/rewind';

export const REWIND_DB_NAME = 'Rewind';
export const REWIND_PROGRESS_COLLECTION = 'ProgressV2';
type ProgressDocument = CloudJourney & { readonly _id: number; readonly createdAt: Date; readonly updatedAt: Date };
const collection = () => getMongoCollection<ProgressDocument>(REWIND_DB_NAME, REWIND_PROGRESS_COLLECTION);
const snapshot = ({ campaignVersion, epoch, revision, progress, room, roomRevision }: ProgressDocument): CloudJourney => ({ campaignVersion, epoch, revision, progress, room, roomRevision });

async function ensureProgress(userId: number): Promise<ProgressDocument> {
  const now = new Date();
  const doc = await collection().findOneAndUpdate({ _id: userId }, { $setOnInsert: { ...emptyCloudJourney(), createdAt: now, updatedAt: now } }, { upsert: true, returnDocument: 'after' });
  if (!doc) throw new Error('Rewind progress could not be created');
  return doc;
}

export async function getProgress(userId: number): Promise<CloudJourney> {
  return snapshot(await ensureProgress(userId));
}

export async function syncProgress(userId: number, request: SyncRequest): Promise<SyncResult> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const saved = await ensureProgress(userId);
    const result = mergeJourney(saved, request);
    if (result.reset) return { ...result, journey: snapshot(saved) };
    const updated = await collection().findOneAndUpdate(
      { _id: userId, epoch: saved.epoch, revision: saved.revision },
      { $set: { ...result.journey, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (updated) return { ...result, journey: snapshot(updated) };
  }
  throw new Error('Rewind progress changed too often; retry synchronization');
}

export async function resetProgress(userId: number, epoch: number): Promise<CloudJourney | null> {
  const saved = await ensureProgress(userId);
  const updated = await collection().findOneAndUpdate(
    { _id: userId, epoch, revision: saved.revision },
    { $set: { ...emptyCloudJourney(), epoch: epoch + 1, revision: saved.revision + 1, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  return updated ? snapshot(updated) : null;
}
