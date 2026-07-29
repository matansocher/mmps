import { getMongoCollection } from '@core/mongo';
import type { Collection } from 'mongodb';
import { FOOTBALL_MANAGER_DB_NAME, LIVE_MATCHES_COLLECTION } from '../constants';
import type { LiveMatchDecision, LiveMatchDocument } from '../types';

function getCollection(): Collection<LiveMatchDocument> {
  return getMongoCollection<LiveMatchDocument>(FOOTBALL_MANAGER_DB_NAME, LIVE_MATCHES_COLLECTION);
}

// The single in-progress live match for a career, if one exists.
export async function getLiveMatch(careerId: string): Promise<LiveMatchDocument | null> {
  return getCollection().findOne({ careerId, status: 'in_progress' });
}

// Start (or restart) the live match for the user's current fixture. Any prior
// in-progress match for the career is discarded so a career only ever has one.
export async function startLiveMatch(
  input: Omit<LiveMatchDocument, '_id' | 'minute' | 'decisions' | 'subsUsed' | 'status' | 'createdAt' | 'updatedAt'>,
): Promise<LiveMatchDocument> {
  await getCollection().deleteMany({ careerId: input.careerId });
  const now = new Date();
  const doc: LiveMatchDocument = { ...input, minute: 0, decisions: [], subsUsed: 0, status: 'in_progress', createdAt: now, updatedAt: now };
  const { insertedId } = await getCollection().insertOne(doc);
  return { ...doc, _id: insertedId };
}

// Advance the playback cursor (clamped to 0..90).
export async function setLiveMatchMinute(careerId: string, minute: number): Promise<void> {
  const clamped = Math.max(0, Math.min(90, Math.floor(minute)));
  await getCollection().updateOne({ careerId, status: 'in_progress' }, { $set: { minute: clamped, updatedAt: new Date() } });
}

// Append an in-match decision (mentality change / substitution). Subs also bump
// the counter so the caller can enforce MAX_SUBS_PER_MATCH.
export async function appendLiveMatchDecision(careerId: string, decision: LiveMatchDecision, isSub: boolean): Promise<void> {
  await getCollection().updateOne(
    { careerId, status: 'in_progress' },
    { $push: { decisions: decision }, $inc: { subsUsed: isSub ? 1 : 0 }, $set: { updatedAt: new Date() } },
  );
}

export async function finishLiveMatch(careerId: string): Promise<void> {
  await getCollection().updateOne({ careerId, status: 'in_progress' }, { $set: { status: 'finished', minute: 90, updatedAt: new Date() } });
}

// Remove any live match rows for a career (used when wiping/resetting a career).
export async function clearLiveMatches(careerId: string): Promise<void> {
  await getCollection().deleteMany({ careerId });
}
