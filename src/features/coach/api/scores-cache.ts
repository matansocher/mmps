import { getGameStats, getGameWithEvents } from '@services/scores-365';
import type { ScoresGameDetails, ScoresGameStat } from '@services/scores-365';
import { LIVE_DATA_TTL_SEC } from './constants';
import { classifyGameStatus } from './transformers';
import { TtlCache } from './ttl-cache';
import type { DashboardGameStatus } from './types';

const LIVE_TTL_MS = LIVE_DATA_TTL_SEC * 1000;
const STATIC_TTL_MS = 10 * 60_000;

const gameCache = new TtlCache<ScoresGameDetails | null>();
const statsCache = new TtlCache<ScoresGameStat[]>();

// Lineups are usually confirmed about an hour before kick-off, so games starting soon refresh like live ones.
const KICKOFF_SOON_MS = 90 * 60_000;

function ttlForStatus(status: DashboardGameStatus | null): number {
  return status === 'live' ? LIVE_TTL_MS : STATIC_TTL_MS;
}

function ttlForGame(game: ScoresGameDetails | null): number {
  if (!game) return STATIC_TTL_MS;
  const status = classifyGameStatus(game.statusGroup);
  const startsSoon = status === 'scheduled' && new Date(game.startTime).getTime() - Date.now() < KICKOFF_SOON_MS;
  return startsSoon ? LIVE_TTL_MS : ttlForStatus(status);
}

// expectedStatus comes from the fresher games list; a mismatch (e.g. a game that just kicked off or ended) forces a refetch.
export async function getCachedGameDetails(gameId: number, expectedStatus?: DashboardGameStatus): Promise<ScoresGameDetails | null> {
  const key = `${gameId}`;
  const cached = gameCache.peek(key);
  if (cached && expectedStatus && classifyGameStatus(cached.statusGroup) !== expectedStatus) gameCache.delete(key);
  return gameCache.get(key, ttlForGame, () => getGameWithEvents(gameId));
}

export async function getCachedGameStats(gameId: number, status: DashboardGameStatus): Promise<ScoresGameStat[]> {
  return statsCache.get(`${gameId}:${status}`, ttlForStatus(status), () => getGameStats(gameId));
}
