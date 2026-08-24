import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from './constants';

type CursorDoc = {
  readonly key: string;
  readonly lastSeenAt: Date;
};

const CURSOR_KEY = 'collect';

function getCollection() {
  return getMongoCollection<CursorDoc>(DB_NAME, 'Cursor');
}

// Returns the newest reportedAt the collector has processed, or null on first run.
export async function getLastSeenAt(): Promise<Date | null> {
  const doc = await getCollection().findOne({ key: CURSOR_KEY });
  return doc?.lastSeenAt ?? null;
}

export async function setLastSeenAt(lastSeenAt: Date): Promise<void> {
  await getCollection().updateOne({ key: CURSOR_KEY }, { $set: { lastSeenAt } }, { upsert: true });
}
