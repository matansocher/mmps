import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { chunk, getErrorMessage, Logger } from '@core/utils';
import { COMPETITIONS, getGamesByDate, searchCompetitors } from '@services/scores-365';
import type { ScoresGame, ScoresGameDetails, ScoresGameStat } from '@services/scores-365';
import { getDashboardPreferences, getSubscription, saveDashboardPreferences } from '@shared/coach';
import type { DashboardLanguage, DashboardPreferences, DashboardPreferencesUpdate } from '@shared/coach';
import { COMPETITION_NAMES, DEFAULT_COMPETITION_IDS, DEFAULT_EVENT_TYPES, DEFAULT_LANGUAGE, LANGUAGE_IDS, LIVE_DATA_TTL_SEC, SEASON_GAMES } from './constants';
import { toDashboardForm } from './detail-transformers';
import { getGameHeadline } from './game-headline';
import { getCachedCompetitionTeamIds, getCachedGameDetails, getCachedGameStats, getCachedHeadToHead, getCachedStandings } from './scores-cache';
import { classifyGameStatus, sortDashboardGames, toDashboardGame } from './transformers';
import { TtlCache } from './ttl-cache';
import type { CompetitionOption, DashboardForm, DashboardPreferencesDto, DashboardResponse, GameHeadline, TeamOption } from './types';

const GAMES_LIST_TTL_MS = LIVE_DATA_TTL_SEC * 1000;
const SEARCH_TTL_MS = 10 * 60_000;
const FETCH_CONCURRENCY = 6;

type EnrichedGame = { readonly game: ScoresGame; readonly details: ScoresGameDetails | null; readonly stats: ScoresGameStat[] | null; readonly form?: DashboardForm; readonly headline?: GameHeadline };

export async function getDefaultDashboardPreferences(telegramUserId: number): Promise<DashboardPreferencesDto> {
  // Seed from the leagues the user already follows in the bot, when set.
  const subscription = await getSubscription(telegramUserId).catch(() => null);
  const competitionIds = subscription?.customLeagues?.length ? subscription.customLeagues : DEFAULT_COMPETITION_IDS;
  return { competitionIds, favoriteTeams: [], eventTypes: DEFAULT_EVENT_TYPES, language: DEFAULT_LANGUAGE };
}

function toPreferencesDto(saved: DashboardPreferences): DashboardPreferencesDto {
  return {
    competitionIds: saved.competitionIds,
    favoriteTeams: saved.favoriteTeams ?? [],
    eventTypes: saved.eventTypes ?? DEFAULT_EVENT_TYPES,
    language: saved.language ?? DEFAULT_LANGUAGE,
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

  getCompetitionOptions(lang: DashboardLanguage): CompetitionOption[] {
    return COMPETITIONS.map((c) => ({ id: c.id, name: COMPETITION_NAMES[lang][c.id] ?? `${c.id}`, icon: c.icon }));
  }

  // Competition id -> number of the user's favorite teams in its current table; competitions with none are left out.
  async getFavoriteTeamCounts(telegramUserId: number): Promise<Record<number, number>> {
    const { favoriteTeams } = await this.getPreferences(telegramUserId);
    if (favoriteTeams.length === 0) return {};
    const favoriteIds = new Set(favoriteTeams.map((t) => t.id));
    const counts: Record<number, number> = {};
    for (const batch of chunk(COMPETITIONS, FETCH_CONCURRENCY)) {
      const teamIds = await Promise.all(batch.map((c) => getCachedCompetitionTeamIds(c.id)));
      batch.forEach((c, i) => {
        const count = teamIds[i].filter((id) => favoriteIds.has(id)).length;
        if (count > 0) counts[c.id] = count;
      });
    }
    return counts;
  }

  async searchTeams(query: string, lang: DashboardLanguage): Promise<TeamOption[]> {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];
    return this.searchCache.get(`${lang}:${normalized}`, SEARCH_TTL_MS, async () => {
      const results = await searchCompetitors(normalized, LANGUAGE_IDS[lang]);
      return results.slice(0, 15).map((c) => ({ id: c.id, name: c.name }));
    });
  }

  async getDashboard(telegramUserId: number, requestedLang?: DashboardLanguage, now = new Date()): Promise<DashboardResponse> {
    const preferences = await this.getPreferences(telegramUserId);
    const lang = requestedLang ?? preferences.language;
    const date = formatInTimeZone(now, DEFAULT_TIMEZONE, 'yyyy-MM-dd');
    const favoriteTeamIds = new Set(preferences.favoriteTeams.map((t) => t.id));

    const games = await this.getTodayGames(now, date, lang, preferences.competitionIds, [...favoriteTeamIds]);

    const enriched: EnrichedGame[] = [];
    for (const batch of chunk(games, FETCH_CONCURRENCY)) {
      enriched.push(...(await Promise.all(batch.map((game) => this.enrichGame(game, lang)))));
    }

    // All events are returned; the client shows a fixed set on cards and uses preferences.eventTypes for notifications.
    const dashboardGames = sortDashboardGames(
      enriched.map(({ game, details, stats, form, headline }) => {
        const dashboardGame = toDashboardGame({ game, details, stats, favoriteTeamIds, lang });
        if (form && dashboardGame.status === 'scheduled') return { ...dashboardGame, form };
        if (headline && dashboardGame.status === 'finished') return { ...dashboardGame, headline };
        return dashboardGame;
      }),
    );

    return { date, updatedAt: new Date().toISOString(), preferences, games: dashboardGames };
  }

  private async getTodayGames(now: Date, date: string, lang: DashboardLanguage, competitionIds: readonly number[], competitorIds: readonly number[]): Promise<ScoresGame[]> {
    const zonedNow = toZonedTime(now, DEFAULT_TIMEZONE);
    // Cached per league and per team (not per user selection) so users with overlapping selections share upstream calls.
    const loaders = [
      ...[...new Set(competitionIds)].map((id) => () => this.fetchGames(`${lang}:c:${date}:${id}`, () => getGamesByDate({ date: zonedNow, competitionIds: [id], langId: LANGUAGE_IDS[lang] }))),
      ...[...new Set(competitorIds)].map((id) => () => this.fetchGames(`${lang}:t:${date}:${id}`, () => getGamesByDate({ date: zonedNow, competitorIds: [id], langId: LANGUAGE_IDS[lang] }))),
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
  private async enrichGame(game: ScoresGame, lang: DashboardLanguage): Promise<EnrichedGame> {
    const status = classifyGameStatus(game.statusGroup);
    const [details, stats, headToHead] = await Promise.all([
      getCachedGameDetails(game.id, lang, status).catch((err) => {
        this.logger.warn(`Failed to load game ${game.id}: ${getErrorMessage(err)}`);
        return null;
      }),
      status === 'live'
        ? getCachedGameStats(game.id, status, lang).catch((err) => {
            this.logger.warn(`Failed to load stats ${game.id}: ${getErrorMessage(err)}`);
            return null;
          })
        : Promise.resolve(null),
      status === 'scheduled' ? getCachedHeadToHead(game.id, lang) : Promise.resolve(null),
    ]);
    const form = toDashboardForm(headToHead, game.homeCompetitor.id, game.awayCompetitor.id);
    const headline = status === 'finished' ? await this.getHeadline(game, details, lang) : undefined;
    return { game, details, stats, ...(form ? { form } : {}), ...(headline ? { headline } : {}) };
  }

  // Finished games get a one-line "what it means" from the table (or the knockout result).
  private async getHeadline(game: ScoresGame, details: ScoresGameDetails | null, lang: DashboardLanguage): Promise<GameHeadline | undefined> {
    const source = details ?? game;
    const standings = details?.hasStandings ? await getCachedStandings(game.competitionId, lang) : null;
    return getGameHeadline(source, standings, SEASON_GAMES[game.competitionId]);
  }
}
