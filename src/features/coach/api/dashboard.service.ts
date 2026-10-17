import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { chunk, getErrorMessage, Logger } from '@core/utils';
import { COMPETITIONS, getGamesByDate, getGameStats, getGameWithEvents, searchCompetitors } from '@services/scores-365';
import type { ScoresGame, ScoresGameDetails, ScoresGameStat } from '@services/scores-365';
import { getDashboardPreferences, getSubscription, saveDashboardPreferences } from '@shared/coach';
import type { DashboardPreferencesUpdate } from '@shared/coach';
import { getSportsCompetitions } from '@shared/sports';
import { COMPETITION_FALLBACK_NAMES, DEFAULT_COMPETITION_IDS, DEFAULT_EVENT_TYPES } from './constants';
import { buildFeed, classifyGameStatus, sortDashboardGames, toDashboardGame } from './transformers';
import type { CompetitionOption, DashboardPreferencesDto, DashboardResponse, TeamOption } from './types';

const GAMES_LIST_TTL_MS = 20_000;
const LIVE_DETAILS_TTL_MS = 20_000;
const FINISHED_DETAILS_TTL_MS = 10 * 60_000;
const STATS_TTL_MS = 45_000;
const COMPETITION_NAMES_TTL_MS = 6 * 60 * 60_000;
const SEARCH_TTL_MS = 10 * 60_000;
const FETCH_CONCURRENCY = 6;
const MAX_CACHE_ENTRIES = 500;

type CacheEntry<T> = { readonly value: T; readonly expiresAt: number };

class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();

  async get(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const value = await load();
        this.set(key, value, ttlMs);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, promise);
    return promise;
  }

  private set(key: string, value: T, ttlMs: number): void {
    if (this.entries.size >= MAX_CACHE_ENTRIES) {
      const now = Date.now();
      for (const [k, entry] of this.entries) {
        if (entry.expiresAt <= now) this.entries.delete(k);
      }
      if (this.entries.size >= MAX_CACHE_ENTRIES) this.entries.delete(this.entries.keys().next().value);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export async function getDefaultDashboardPreferences(telegramUserId: number): Promise<DashboardPreferencesDto> {
  // Seed from the leagues the user already follows in the bot, when set.
  const subscription = await getSubscription(telegramUserId).catch(() => null);
  const competitionIds = subscription?.customLeagues?.length ? subscription.customLeagues : DEFAULT_COMPETITION_IDS;
  return { competitionIds, favoriteTeams: [], eventTypes: DEFAULT_EVENT_TYPES };
}

export class CoachDashboardService {
  private readonly logger = new Logger('coach:dashboard');
  private readonly gamesCache = new TtlCache<ScoresGame[]>();
  private readonly detailsCache = new TtlCache<ScoresGameDetails | null>();
  private readonly statsCache = new TtlCache<ScoresGameStat[] | null>();
  private readonly competitionNamesCache = new TtlCache<Map<number, string>>();
  private readonly searchCache = new TtlCache<TeamOption[]>();

  async getPreferences(telegramUserId: number): Promise<DashboardPreferencesDto> {
    const saved = await getDashboardPreferences(telegramUserId);
    if (saved?.competitionIds) {
      return { competitionIds: saved.competitionIds, favoriteTeams: saved.favoriteTeams ?? [], eventTypes: saved.eventTypes ?? DEFAULT_EVENT_TYPES };
    }
    return getDefaultDashboardPreferences(telegramUserId);
  }

  async savePreferences(telegramUserId: number, update: DashboardPreferencesUpdate): Promise<DashboardPreferencesDto> {
    const saved = await saveDashboardPreferences(telegramUserId, update);
    return { competitionIds: saved.competitionIds, favoriteTeams: saved.favoriteTeams, eventTypes: saved.eventTypes };
  }

  async getCompetitionOptions(): Promise<CompetitionOption[]> {
    const names = await this.getCompetitionNames();
    return COMPETITIONS.map((c) => ({ id: c.id, name: names.get(c.id) ?? COMPETITION_FALLBACK_NAMES[c.id] ?? `${c.id}`, icon: c.icon }));
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

    const [games, competitionNames] = await Promise.all([this.getTodayGames(now, date, preferences.competitionIds, [...favoriteTeamIds]), this.getCompetitionNames()]);

    const enriched = [];
    for (const batch of chunk(games, FETCH_CONCURRENCY)) {
      enriched.push(...(await Promise.all(batch.map((game) => this.enrichGame(game)))));
    }

    const eventTypes = new Set(preferences.eventTypes);
    const dashboardGames = sortDashboardGames(
      enriched.map(({ game, details, stats }) => {
        const dashboardGame = toDashboardGame({ game, details, stats, favoriteTeamIds, competitionNames });
        return { ...dashboardGame, events: dashboardGame.events.filter((e) => eventTypes.has(e.type)) };
      }),
    );

    return {
      date,
      updatedAt: new Date().toISOString(),
      preferences,
      games: dashboardGames,
      feed: buildFeed(dashboardGames),
    };
  }

  private async getTodayGames(now: Date, date: string, competitionIds: readonly number[], competitorIds: readonly number[]): Promise<ScoresGame[]> {
    const zonedNow = toZonedTime(now, DEFAULT_TIMEZONE);
    const [byCompetition, byTeam] = await Promise.all([
      this.fetchGames(`c:${date}:${[...competitionIds].sort().join(',')}`, () => getGamesByDate({ date: zonedNow, competitionIds })),
      this.fetchGames(`t:${date}:${[...competitorIds].sort().join(',')}`, () => getGamesByDate({ date: zonedNow, competitorIds })),
    ]);
    const unique = new Map<number, ScoresGame>();
    for (const game of [...byCompetition, ...byTeam]) {
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

  private async enrichGame(game: ScoresGame): Promise<{ game: ScoresGame; details: ScoresGameDetails | null; stats: ScoresGameStat[] | null }> {
    const status = classifyGameStatus(game.statusGroup);
    if (status !== 'live' && status !== 'finished') return { game, details: null, stats: null };

    const detailsTtl = status === 'live' ? LIVE_DETAILS_TTL_MS : FINISHED_DETAILS_TTL_MS;
    // Cache key includes status so a game that just finished is refetched once with its final events.
    const [details, stats] = await Promise.all([
      this.detailsCache
        .get(`${game.id}:${status}`, detailsTtl, () => getGameWithEvents(game.id))
        .catch((err) => {
          this.logger.warn(`Failed to load game ${game.id}: ${getErrorMessage(err)}`);
          return null;
        }),
      status === 'live'
        ? this.statsCache
            .get(`${game.id}`, STATS_TTL_MS, () => getGameStats(game.id))
            .catch((err) => {
              this.logger.warn(`Failed to load stats ${game.id}: ${getErrorMessage(err)}`);
              return null;
            })
        : Promise.resolve(null),
    ]);
    return { game, details, stats };
  }

  private async getCompetitionNames(): Promise<Map<number, string>> {
    try {
      return await this.competitionNamesCache.get('all', COMPETITION_NAMES_TTL_MS, async () => {
        const competitions = (await getSportsCompetitions()) ?? [];
        if (!competitions.length) throw new Error('no competitions returned');
        return new Map(competitions.map((c) => [c.id, c.name]));
      });
    } catch (err) {
      this.logger.warn(`Failed to load competition names: ${getErrorMessage(err)}`);
      return new Map();
    }
  }
}
