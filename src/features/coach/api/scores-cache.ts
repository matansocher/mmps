import { getGameStats, getGameWithEvents } from '@services/scores-365';
import type { ScoresGameDetails, ScoresGameStat } from '@services/scores-365';
import { LIVE_DATA_TTL_SEC } from './constants';
import { classifyGameStatus } from './transformers';
import type { DashboardGameStatus } from './types';
import { TtlCache } from './ttl-cache';

const LIVE_TTL_MS = LIVE_DATA_TTL_SEC * 1000;
const STATIC_TTL_MS = 10 * 60_000;

const gameCache = new TtlCache<ScoresGameDetails | null>();
const statsCache = new TtlCache<ScoresGameStat[]>();

function ttlForStatus(status: DashboardGameStatus | null): number {
  return status === 'live' ? LIVE_TTL_MS : STATIC_TTL_MS;
}

// expectedStatus comes from the fresher games list; a mismatch (e.g. a game that just kicked off or ended) forces a refetch.
export async function getCachedGameDetails(gameId: number, expectedStatus?: DashboardGameStatus): Promise<ScoresGameDetails | null> {
  const key = `${gameId}`;
  const cached = gameCache.peek(key);
  if (cached && expectedStatus && classifyGameStatus(cached.statusGroup) !== expectedStatus) gameCache.delete(key);
  return gameCache.get(key, (game) => ttlForStatus(game ? classifyGameStatus(game.statusGroup) : null), () => getGameWithEvents(gameId));
}

export async function getCachedGameStats(gameId: number, status: DashboardGameStatus): Promise<ScoresGameStat[]> {
  return statsCache.get(`${gameId}:${status}`, ttlForStatus(status), () => getGameStats(gameId));
}
