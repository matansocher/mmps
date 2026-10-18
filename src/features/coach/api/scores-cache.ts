import { getErrorMessage, Logger } from '@core/utils';
import { getGameStats, getGameWithEvents, getHeadToHead, getStandings } from '@services/scores-365';
import type { ScoresGameDetails, ScoresGameStat, ScoresStandings } from '@services/scores-365';
import type { DashboardLanguage } from '@shared/coach';
import { LANGUAGE_IDS, LIVE_DATA_TTL_SEC } from './constants';
import { toHeadToHead } from './detail-transformers';
import { classifyGameStatus } from './transformers';
import { TtlCache } from './ttl-cache';
import type { DashboardGameStatus, HeadToHead } from './types';

const LIVE_TTL_MS = LIVE_DATA_TTL_SEC * 1000;
const STATIC_TTL_MS = 10 * 60_000;

const gameCache = new TtlCache<ScoresGameDetails | null>();
const statsCache = new TtlCache<ScoresGameStat[]>();
const headToHeadCache = new TtlCache<HeadToHead | null>();
const standingsCache = new TtlCache<ScoresStandings | null>();
const competitionTeamsCache = new TtlCache<readonly number[]>();

const logger = new Logger('coach:scores-cache');
// Recent form and past meetings only change after a game ends.
const HEAD_TO_HEAD_TTL_MS = 30 * 60_000;
// Tables update a little after the final whistle, so finished-game headlines retry often.
const STANDINGS_TTL_MS = 2 * 60_000;
// Who plays in a competition barely changes during a season.
const COMPETITION_TEAMS_TTL_MS = 6 * 60 * 60_000;

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
export async function getCachedGameDetails(gameId: number, lang: DashboardLanguage, expectedStatus?: DashboardGameStatus): Promise<ScoresGameDetails | null> {
  const key = `${lang}:${gameId}`;
  const cached = gameCache.peek(key);
  if (cached && expectedStatus && classifyGameStatus(cached.statusGroup) !== expectedStatus) gameCache.delete(key);
  return gameCache.get(key, ttlForGame, () => getGameWithEvents(gameId, LANGUAGE_IDS[lang]));
}

export async function getCachedGameStats(gameId: number, status: DashboardGameStatus, lang: DashboardLanguage): Promise<ScoresGameStat[]> {
  return statsCache.get(`${lang}:${gameId}:${status}`, ttlForStatus(status), () => getGameStats(gameId, LANGUAGE_IDS[lang]));
}

// Shared by the game page and the form strip on upcoming dashboard cards.
export async function getCachedHeadToHead(gameId: number, lang: DashboardLanguage): Promise<HeadToHead | null> {
  return headToHeadCache
    .get(`${lang}:${gameId}`, HEAD_TO_HEAD_TTL_MS, async () => toHeadToHead(await getHeadToHead(gameId, LANGUAGE_IDS[lang]), lang) ?? null)
    .catch((err) => {
      logger.warn(`Failed to load head-to-head ${gameId}: ${getErrorMessage(err)}`);
      return null;
    });
}

export async function getCachedStandings(competitionId: number, lang: DashboardLanguage): Promise<ScoresStandings | null> {
  return standingsCache
    .get(`${lang}:${competitionId}`, STANDINGS_TTL_MS, () => getStandings(competitionId, LANGUAGE_IDS[lang]))
    .catch((err) => {
      logger.warn(`Failed to load standings ${competitionId}: ${getErrorMessage(err)}`);
      return null;
    });
}

// Team ids in the competition's current table; empty for competitions without one (e.g. cups).
export async function getCachedCompetitionTeamIds(competitionId: number): Promise<readonly number[]> {
  return competitionTeamsCache
    .get(`${competitionId}`, COMPETITION_TEAMS_TTL_MS, async () => {
      const standings = await getStandings(competitionId, LANGUAGE_IDS.en);
      return standings?.rows.map((row) => row.competitor.id) ?? [];
    })
    .catch((err) => {
      logger.warn(`Failed to load teams of competition ${competitionId}: ${getErrorMessage(err)}`);
      return [];
    });
}
