import { getMongoCollection } from '@core/mongo';
import { DB_NAME, EMPTY_GLOBE_PROGRESS, type GlobeProgressDocument, type GlobeProgressSnapshot, mergeGlobeSnapshots } from '@shared/worldly';

const COLLECTION = 'GlobeProgress';
const MAX_MERGE_RETRIES = 5;

const getCollection = () => getMongoCollection<GlobeProgressDocument>(DB_NAME, COLLECTION);

async function ensureGlobeProgress(telegramUserId: number): Promise<GlobeProgressDocument> {
  const now = new Date();
  const result = await getCollection().findOneAndUpdate(
    { _id: telegramUserId },
    { $setOnInsert: { _id: telegramUserId, progress: EMPTY_GLOBE_PROGRESS, bestScores: {}, revision: 0, createdAt: now, updatedAt: now } },
    { upsert: true, returnDocument: 'after' },
  );
  return result as GlobeProgressDocument;
}

// Revision-guarded compare-and-swap with bounded retries, mirroring the learner pattern.
export async function mergeGlobeProgressSync(telegramUserId: number, snapshot: GlobeProgressSnapshot): Promise<GlobeProgressDocument> {
  const collection = getCollection();

  for (let attempt = 0; attempt < MAX_MERGE_RETRIES; attempt++) {
    const doc = await ensureGlobeProgress(telegramUserId);
    const merged = mergeGlobeSnapshots(doc, snapshot);
    const updated = await collection.findOneAndUpdate(
      { _id: telegramUserId, revision: doc.revision },
      { $set: { progress: merged.progress, bestScores: merged.bestScores, updatedAt: new Date() }, $inc: { revision: 1 } },
      { returnDocument: 'after' },
    );
    if (updated) return updated;
  }

  throw new Error(`mergeGlobeProgressSync failed after ${MAX_MERGE_RETRIES} attempts due to concurrent updates`);
}
