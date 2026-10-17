import { getErrorMessage, Logger } from '@core/utils';
import { getGameStats, getGameWithEvents, getHeadToHead } from '@services/scores-365';
import type { ScoresGameDetails, ScoresGameStat } from '@services/scores-365';
import { LIVE_DATA_TTL_SEC } from './constants';
import { toHeadToHead } from './detail-transformers';
import { classifyGameStatus } from './transformers';
import { TtlCache } from './ttl-cache';
import type { DashboardGameStatus, HeadToHead } from './types';

const LIVE_TTL_MS = LIVE_DATA_TTL_SEC * 1000;
const STATIC_TTL_MS = 10 * 60_000;

const gameCache = new TtlCache<ScoresGameDetails | null>();
const statsCache = new TtlCache<ScoresGameStat[]>();
const headToHeadCache = new TtlCache<HeadToHead | null>();

const logger = new Logger('coach:scores-cache');
// Recent form and past meetings only change after a game ends.
const HEAD_TO_HEAD_TTL_MS = 30 * 60_000;

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

// Shared by the game page and the form strip on upcoming dashboard cards.
export async function getCachedHeadToHead(gameId: number): Promise<HeadToHead | null> {
  return headToHeadCache
    .get(`${gameId}`, HEAD_TO_HEAD_TTL_MS, async () => toHeadToHead(await getHeadToHead(gameId)) ?? null)
    .catch((err) => {
      logger.warn(`Failed to load head-to-head ${gameId}: ${getErrorMessage(err)}`);
      return null;
    });
}
