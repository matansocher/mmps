import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { chunk, getErrorMessage, Logger } from '@core/utils';
import { COMPETITIONS, getGamesByDate, searchCompetitors } from '@services/scores-365';
import type { ScoresGame, ScoresGameDetails, ScoresGameStat } from '@services/scores-365';
import { getDashboardPreferences, getSubscription, saveDashboardPreferences } from '@shared/coach';
import type { DashboardPreferences, DashboardPreferencesUpdate } from '@shared/coach';
import { COMPETITION_NAMES, DEFAULT_COMPETITION_IDS, DEFAULT_EVENT_TYPES, DEFAULT_REFRESH_INTERVAL_SEC, LIVE_DATA_TTL_SEC } from './constants';
import { toDashboardForm } from './detail-transformers';
import { parseRefreshInterval } from './dto';
import { getCachedGameDetails, getCachedGameStats, getCachedHeadToHead } from './scores-cache';
import { classifyGameStatus, sortDashboardGames, toDashboardGame } from './transformers';
import { TtlCache } from './ttl-cache';
import type { CompetitionOption, DashboardForm, DashboardPreferencesDto, DashboardResponse, TeamOption } from './types';

const GAMES_LIST_TTL_MS = LIVE_DATA_TTL_SEC * 1000;
const SEARCH_TTL_MS = 10 * 60_000;
const FETCH_CONCURRENCY = 6;

type EnrichedGame = { readonly game: ScoresGame; readonly details: ScoresGameDetails | null; readonly stats: ScoresGameStat[] | null; readonly form?: DashboardForm };

export async function getDefaultDashboardPreferences(telegramUserId: number): Promise<DashboardPreferencesDto> {
  // Seed from the leagues the user already follows in the bot, when set.
  const subscription = await getSubscription(telegramUserId).catch(() => null);
  const competitionIds = subscription?.customLeagues?.length ? subscription.customLeagues : DEFAULT_COMPETITION_IDS;
  return { competitionIds, favoriteTeams: [], eventTypes: DEFAULT_EVENT_TYPES, refreshIntervalSec: DEFAULT_REFRESH_INTERVAL_SEC };
}

function toPreferencesDto(saved: DashboardPreferences): DashboardPreferencesDto {
  return {
    competitionIds: saved.competitionIds,
    favoriteTeams: saved.favoriteTeams ?? [],
    eventTypes: saved.eventTypes ?? DEFAULT_EVENT_TYPES,
    refreshIntervalSec: parseRefreshInterval(saved.refreshIntervalSec),
  };
}

export class CoachDashboardService {
  private readonly logger = new Logger('coach:dashboard');
  private readonly gamesCache = new TtlCache<ScoresGame[]>();
  private readonly searchCache = new TtlCache<TeamOption[]>();

  async getPreferences(telegramUserId: number): Promise<DashboardPreferencesDto> {
    const saved = await getDashboardPreferences(telegramUserId);
    return saved?.competitionIds ? toPreferencesDto(saved) : getDefaultDashboardPreferences(telegramUserId);
  }

  async savePreferences(telegramUserId: number, update: DashboardPreferencesUpdate): Promise<DashboardPreferencesDto> {
    return toPreferencesDto(await saveDashboardPreferences(telegramUserId, update));
  }

  getCompetitionOptions(): CompetitionOption[] {
    return COMPETITIONS.map((c) => ({ id: c.id, name: COMPETITION_NAMES[c.id] ?? `${c.id}`, icon: c.icon }));
  }

  async searchTeams(query: string): Promise<TeamOption[]> {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];
    return this.searchCache.get(normalized, SEARCH_TTL_MS, async () => {
      const results = await searchCompetitors(normalized);
      return results.slice(0, 15).map((c) => ({ id: c.id, name: c.name }));
    });
  }

  async getDashboard(telegramUserId: number, now = new Date()): Promise<DashboardResponse> {
    const preferences = await this.getPreferences(telegramUserId);
    const date = formatInTimeZone(now, DEFAULT_TIMEZONE, 'yyyy-MM-dd');
    const favoriteTeamIds = new Set(preferences.favoriteTeams.map((t) => t.id));

    const games = await this.getTodayGames(now, date, preferences.competitionIds, [...favoriteTeamIds]);

    const enriched: EnrichedGame[] = [];
    for (const batch of chunk(games, FETCH_CONCURRENCY)) {
      enriched.push(...(await Promise.all(batch.map((game) => this.enrichGame(game)))));
    }

    // All events are returned; the client shows a fixed set on cards and uses preferences.eventTypes for notifications.
    const dashboardGames = sortDashboardGames(
      enriched.map(({ game, details, stats, form }) => {
        const dashboardGame = toDashboardGame({ game, details, stats, favoriteTeamIds });
        return form && dashboardGame.status === 'scheduled' ? { ...dashboardGame, form } : dashboardGame;
      }),
    );

    return { date, updatedAt: new Date().toISOString(), preferences, games: dashboardGames };
  }

  private async getTodayGames(now: Date, date: string, competitionIds: readonly number[], competitorIds: readonly number[]): Promise<ScoresGame[]> {
    const zonedNow = toZonedTime(now, DEFAULT_TIMEZONE);
    // Cached per league and per team (not per user selection) so users with overlapping selections share upstream calls.
    const loaders = [
      ...[...new Set(competitionIds)].map((id) => () => this.fetchGames(`c:${date}:${id}`, () => getGamesByDate({ date: zonedNow, competitionIds: [id] }))),
      ...[...new Set(competitorIds)].map((id) => () => this.fetchGames(`t:${date}:${id}`, () => getGamesByDate({ date: zonedNow, competitorIds: [id] }))),
    ];
    const lists: ScoresGame[][] = [];
    for (const batch of chunk(loaders, FETCH_CONCURRENCY)) {
      lists.push(...(await Promise.all(batch.map((load) => load()))));
    }
    const unique = new Map<number, ScoresGame>();
    for (const game of lists.flat()) {
      // The day range is inclusive, so keep only games that kick off on the requested local date.
      if (formatInTimeZone(new Date(game.startTime), DEFAULT_TIMEZONE, 'yyyy-MM-dd') === date) unique.set(game.id, game);
    }
    return [...unique.values()];
  }

  private async fetchGames(key: string, load: () => Promise<ScoresGame[]>): Promise<ScoresGame[]> {
    try {
      return await this.gamesCache.get(key, GAMES_LIST_TTL_MS, load);
    } catch (err) {
      this.logger.error(`Failed to load games (${key}): ${getErrorMessage(err)}`);
      return [];
    }
  }

  // Every game needs its details for the TV channels; live games need stats and upcoming ones recent form.
  private async enrichGame(game: ScoresGame): Promise<EnrichedGame> {
    const status = classifyGameStatus(game.statusGroup);
    const [details, stats, headToHead] = await Promise.all([
      getCachedGameDetails(game.id, status).catch((err) => {
        this.logger.warn(`Failed to load game ${game.id}: ${getErrorMessage(err)}`);
        return null;
      }),
      status === 'live'
        ? getCachedGameStats(game.id, status).catch((err) => {
            this.logger.warn(`Failed to load stats ${game.id}: ${getErrorMessage(err)}`);
            return null;
          })
        : Promise.resolve(null),
      status === 'scheduled' ? getCachedHeadToHead(game.id) : Promise.resolve(null),
    ]);
    const form = toDashboardForm(headToHead, game.homeCompetitor.id, game.awayCompetitor.id);
    return { game, details, stats, ...(form ? { form } : {}) };
  }
}
