import { getMongoCollection } from '@core/mongo';
import { LEARNER_DB_NAME, LEARNER_MAX_MERGE_RETRIES, LEARNER_PROGRESS_COLLECTION } from '../constants';
import { applyRating, computeStreak, localDateKey } from '../learner-scheduler';
import type { LearnerBiteState, LearnerProgressDocument, LearnerRating, LearnerSyncData } from '../types';

const getCollection = () => getMongoCollection<LearnerProgressDocument>(LEARNER_DB_NAME, LEARNER_PROGRESS_COLLECTION);

export async function getProgress(telegramUserId: number): Promise<LearnerProgressDocument | null> {
  return getCollection().findOne({ _id: telegramUserId });
}

async function ensureProgress(telegramUserId: number): Promise<LearnerProgressDocument> {
  const now = new Date();
  const result = await getCollection().findOneAndUpdate(
    { _id: telegramUserId },
    { $setOnInsert: { _id: telegramUserId, states: {}, streak: 0, lastStudyDate: null, revision: 0, createdAt: now, updatedAt: now } },
    { upsert: true, returnDocument: 'after' },
  );
  return result as LearnerProgressDocument;
}

// Keep the most recently read per-bite state when merging two snapshots.
function mergeStates(a: Record<string, LearnerBiteState>, b: Record<string, LearnerBiteState>): Record<string, LearnerBiteState> {
  const out: Record<string, LearnerBiteState> = { ...a };
  for (const [id, incoming] of Object.entries(b)) {
    const existing = out[id];
    if (!existing) {
      out[id] = incoming;
      continue;
    }
    const existingTime = existing.readAt ? Date.parse(existing.readAt) : 0;
    const incomingTime = incoming.readAt ? Date.parse(incoming.readAt) : 0;
    out[id] = incomingTime > existingTime ? incoming : existing;
  }
  return out;
}

/**
 * Non-destructive merge of a client snapshot. Runs as a revision-guarded
 * compare-and-swap with bounded retries, mirroring the mindloop pattern.
 */
export async function mergeSync(telegramUserId: number, data: LearnerSyncData): Promise<LearnerProgressDocument> {
  const collection = getCollection();

  for (let attempt = 0; attempt < LEARNER_MAX_MERGE_RETRIES; attempt++) {
    const doc = await ensureProgress(telegramUserId);
    const now = new Date();
    const states = mergeStates(doc.states, data.states ?? {});
    const docTime = doc.updatedAt ? doc.updatedAt.getTime() : 0;
    const incomingTime = data.updatedAt ? Date.parse(data.updatedAt) : 0;
    const streak = Math.max(doc.streak, data.streak ?? 0);
    const lastStudyDate = incomingTime > docTime ? data.lastStudyDate : doc.lastStudyDate;

    const updated = await collection.findOneAndUpdate(
      { _id: telegramUserId, revision: doc.revision },
      { $set: { states, streak, lastStudyDate, updatedAt: now }, $inc: { revision: 1 } },
      { returnDocument: 'after' },
    );
    if (updated) return updated;
  }

  throw new Error(`mergeSync failed after ${LEARNER_MAX_MERGE_RETRIES} attempts due to concurrent updates`);
}

/**
 * Applies a spaced-repetition rating to a single bite (used when the user rates
 * from a Telegram reminder). Revision-guarded compare-and-swap with retries.
 */
export async function applyRatingServerSide(telegramUserId: number, biteId: string, rating: LearnerRating, now: Date = new Date()): Promise<LearnerProgressDocument> {
  const collection = getCollection();

  for (let attempt = 0; attempt < LEARNER_MAX_MERGE_RETRIES; attempt++) {
    const doc = await ensureProgress(telegramUserId);
    const nextState = { ...applyRating(doc.states[biteId], rating, now), biteId };
    const streak = computeStreak(doc, now);
    const lastStudyDate = localDateKey(now);

    const updated = await collection.findOneAndUpdate(
      { _id: telegramUserId, revision: doc.revision },
      { $set: { [`states.${biteId}`]: nextState, streak, lastStudyDate, updatedAt: now }, $inc: { revision: 1 } },
      { returnDocument: 'after' },
    );
    if (updated) return updated;
  }

  throw new Error(`applyRatingServerSide failed after ${LEARNER_MAX_MERGE_RETRIES} attempts due to concurrent updates`);
}
