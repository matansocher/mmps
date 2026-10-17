import { getErrorMessage, Logger } from '@core/utils';
import { COMPETITIONS, getAthleteDetails, getBrackets, getCompetitorDetails, getCompetitorGames, getCompetitorSquad, getStandings } from '@services/scores-365';
import { getDashboardPreferences } from '@shared/coach';
import type { DashboardLanguage } from '@shared/coach';
import { LANGUAGE_IDS, LIVE_DATA_TTL_SEC } from './constants';
import { toGameDetail, toKnockoutStages, toPlayerDetail, toStandingsTables, toTeamDetail } from './detail-transformers';
import { getCachedGameDetails, getCachedGameStats, getCachedHeadToHead } from './scores-cache';
import { classifyGameStatus, getCompetitionName, toDashboardGame } from './transformers';
import { TtlCache } from './ttl-cache';
import type { CompetitionDetailResponse, GameDetailResponse, PlayerDetailResponse, TeamDetailResponse } from './types';

const PROFILE_TTL_MS = 30 * 60_000;
const COMPETITION_TTL_MS = 2 * 60_000;
const LIVE_COMPETITION_TTL_MS = LIVE_DATA_TTL_SEC * 1000;

export class CoachDetailsService {
  private readonly logger = new Logger('coach:details');
  private readonly teamCache = new TtlCache<TeamDetailResponse | null>();
  private readonly playerCache = new TtlCache<PlayerDetailResponse | null>();
  private readonly competitionCache = new TtlCache<CompetitionDetailResponse | null>();

  async getGame(telegramUserId: number, gameId: number, lang: DashboardLanguage): Promise<GameDetailResponse | null> {
    const details = await getCachedGameDetails(gameId, lang);
    if (!details) return null;
    const status = classifyGameStatus(details.statusGroup);
    const [stats, preferences, headToHead] = await Promise.all([
      status === 'scheduled'
        ? Promise.resolve(null)
        : getCachedGameStats(gameId, status, lang).catch((err) => {
            this.logger.warn(`Failed to load stats ${gameId}: ${getErrorMessage(err)}`);
            return null;
          }),
      getDashboardPreferences(telegramUserId).catch(() => null),
      getCachedHeadToHead(gameId, lang),
    ]);
    const favoriteTeamIds = new Set<number>((preferences?.favoriteTeams ?? []).map((t) => t.id));
    const game = toDashboardGame({ game: details, details, stats, favoriteTeamIds, lang });
    return { ...toGameDetail(game, details, stats), ...(headToHead ? { headToHead } : {}) };
  }

  async getTeam(teamId: number, lang: DashboardLanguage): Promise<TeamDetailResponse | null> {
    const langId = LANGUAGE_IDS[lang];
    return this.teamCache.get(`${lang}:${teamId}`, PROFILE_TTL_MS, async () => {
      const [team, results, fixtures, squad] = await Promise.all([
        getCompetitorDetails(teamId, langId),
        getCompetitorGames(teamId, 'results', langId).catch(() => []),
        getCompetitorGames(teamId, 'fixtures', langId).catch(() => []),
        getCompetitorSquad(teamId, langId).catch(() => []),
      ]);
      return team ? toTeamDetail({ team, results, fixtures, squad, lang }) : null;
    });
  }

  async getPlayer(athleteId: number, lang: DashboardLanguage): Promise<PlayerDetailResponse | null> {
    return this.playerCache.get(`${lang}:${athleteId}`, PROFILE_TTL_MS, async () => {
      const athlete = await getAthleteDetails(athleteId, LANGUAGE_IDS[lang]);
      return athlete ? toPlayerDetail(athlete, lang) : null;
    });
  }

  async getCompetition(competitionId: number, lang: DashboardLanguage): Promise<CompetitionDetailResponse | null> {
    const competition = COMPETITIONS.find((c) => c.id === competitionId);
    if (!competition) return null;
    return this.competitionCache.get(
      `${lang}:${competitionId}`,
      (competition) => (competition?.tables.some((t) => t.rows.some((r) => r.isLive)) ? LIVE_COMPETITION_TTL_MS : COMPETITION_TTL_MS),
      async () => {
        const [standings, brackets] = await Promise.all([
          getStandings(competitionId, LANGUAGE_IDS[lang]).catch((err) => {
            this.logger.warn(`Failed to load standings ${competitionId}: ${getErrorMessage(err)}`);
            return null;
          }),
          getBrackets(competitionId, LANGUAGE_IDS[lang]).catch((err) => {
            this.logger.warn(`Failed to load brackets ${competitionId}: ${getErrorMessage(err)}`);
            return [];
          }),
        ]);
        const { tables, zones } = toStandingsTables(standings);
        return { id: competitionId, name: getCompetitionName(competitionId, lang), icon: competition.icon, tables, zones, knockout: toKnockoutStages(brackets) };
      },
    );
  }
}
