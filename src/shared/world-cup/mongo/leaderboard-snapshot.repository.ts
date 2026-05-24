import { getMongoCollection } from '@core/mongo';
import { DB_NAME, LEADERBOARD_SNAPSHOT_COLLECTION } from './constants';

type SnapshotEntry = {
  readonly telegramUserId: number;
  readonly firstName: string;
  readonly lastName?: string;
  readonly displayName?: string;
  readonly points: number;
  readonly guessCount: number;
};

function getCollection() {
  return getMongoCollection<SnapshotEntry>(DB_NAME, LEADERBOARD_SNAPSHOT_COLLECTION);
}

export async function getLeaderboardSnapshot(): Promise<SnapshotEntry[]> {
  return getCollection().find({}).sort({ points: -1 }).toArray();
}
