import { getMongoCollection } from '@core/mongo';
import { MINDLOOP_DB_NAME, MINDLOOP_MAX_HISTORY_ENTRIES, MINDLOOP_PLAYERS_COLLECTION } from '../constants';
import type { MindloopBestScores, MindloopPlayEntry, MindloopPlayerDocument, MindloopSyncData } from '../types';

const getCollection = () => getMongoCollection<MindloopPlayerDocument>(MINDLOOP_DB_NAME, MINDLOOP_PLAYERS_COLLECTION);

export async function getPlayer(telegramUserId: number): Promise<MindloopPlayerDocument | null> {
  return getCollection().findOne({ _id: telegramUserId });
}

/** Best score per game, keeping the higher of two maps. */
function mergeBestScores(a: MindloopBestScores, b: MindloopBestScores): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [gameId, score] of Object.entries(b)) {
    if (typeof score === 'number' && Number.isFinite(score) && score > (out[gameId] ?? 0)) {
      out[gameId] = score;
    }
  }
  return out;
}

/** Newest-first, de-duplicated by (gameId, at), capped to the max size. */
function mergeHistory(a: ReadonlyArray<MindloopPlayEntry>, b: ReadonlyArray<MindloopPlayEntry>): MindloopPlayEntry[] {
  const seen = new Set<string>();
  const merged = [...a, ...b]
    .filter((e) => typeof e?.gameId === 'string' && typeof e?.score === 'number' && typeof e?.at === 'string')
    .sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0));
  const out: MindloopPlayEntry[] = [];
  for (const entry of merged) {
    const key = `${entry.gameId}@${entry.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ gameId: entry.gameId, score: entry.score, at: entry.at });
    if (out.length >= MINDLOOP_MAX_HISTORY_ENTRIES) break;
  }
  return out;
}

async function ensurePlayer(telegramUserId: number): Promise<MindloopPlayerDocument> {
  const now = new Date();
  const result = await getCollection().findOneAndUpdate(
    { _id: telegramUserId },
    {
      $setOnInsert: {
        _id: telegramUserId,
        bestScores: {},
        favorites: [],
        history: [],
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
  // findOneAndUpdate with upsert + returnDocument:'after' always returns the doc.
  return result as MindloopPlayerDocument;
}

/** Records a finished run: updates best score if beaten and prepends history. */
export async function recordResult(telegramUserId: number, gameId: string, score: number): Promise<MindloopPlayerDocument> {
  const player = await ensurePlayer(telegramUserId);
  const now = new Date();
  const bestScores = mergeBestScores(player.bestScores, { [gameId]: score });
  const history = mergeHistory([{ gameId, score, at: now.toISOString() }], player.history);

  const updated = await getCollection().findOneAndUpdate(
    { _id: telegramUserId },
    { $set: { bestScores, history, updatedAt: now } },
    { returnDocument: 'after' },
  );
  return updated as MindloopPlayerDocument;
}

export async function setFavorites(telegramUserId: number, favorites: ReadonlyArray<string>): Promise<MindloopPlayerDocument> {
  await ensurePlayer(telegramUserId);
  const now = new Date();
  const unique = [...new Set(favorites.filter((id) => typeof id === 'string' && id.length > 0))];
  const updated = await getCollection().findOneAndUpdate(
    { _id: telegramUserId },
    { $set: { favorites: unique, updatedAt: now } },
    { returnDocument: 'after' },
  );
  return updated as MindloopPlayerDocument;
}

/** Merges a full client snapshot into the stored player (non-destructive union). */
export async function mergeSync(telegramUserId: number, data: MindloopSyncData): Promise<MindloopPlayerDocument> {
  const player = await ensurePlayer(telegramUserId);
  const now = new Date();
  const bestScores = mergeBestScores(player.bestScores, data.bestScores);
  const favorites = [...new Set([...player.favorites, ...data.favorites].filter((id) => typeof id === 'string' && id.length > 0))];
  const history = mergeHistory(player.history, data.history);

  const updated = await getCollection().findOneAndUpdate(
    { _id: telegramUserId },
    { $set: { bestScores, favorites, history, updatedAt: now } },
    { returnDocument: 'after' },
  );
  return updated as MindloopPlayerDocument;
}
