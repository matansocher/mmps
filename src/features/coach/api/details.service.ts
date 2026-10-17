import { getErrorMessage, Logger } from '@core/utils';
import { COMPETITIONS, getAthleteDetails, getBrackets, getCompetitorDetails, getCompetitorGames, getCompetitorSquad, getHeadToHead, getStandings } from '@services/scores-365';
import { getDashboardPreferences } from '@shared/coach';
import { LIVE_DATA_TTL_SEC } from './constants';
import { toGameDetail, toHeadToHead, toKnockoutStages, toPlayerDetail, toStandingsTables, toTeamDetail } from './detail-transformers';
import { getCachedGameDetails, getCachedGameStats } from './scores-cache';
import { classifyGameStatus, getCompetitionName, toDashboardGame } from './transformers';
import { TtlCache } from './ttl-cache';
import type { CompetitionDetailResponse, GameDetailResponse, HeadToHead, PlayerDetailResponse, TeamDetailResponse } from './types';

const PROFILE_TTL_MS = 30 * 60_000;
const COMPETITION_TTL_MS = 2 * 60_000;
const LIVE_COMPETITION_TTL_MS = LIVE_DATA_TTL_SEC * 1000;

export class CoachDetailsService {
  private readonly logger = new Logger('coach:details');
  private readonly teamCache = new TtlCache<TeamDetailResponse | null>();
  private readonly playerCache = new TtlCache<PlayerDetailResponse | null>();
  private readonly competitionCache = new TtlCache<CompetitionDetailResponse | null>();
  private readonly headToHeadCache = new TtlCache<HeadToHead | null>();

  async getGame(telegramUserId: number, gameId: number): Promise<GameDetailResponse | null> {
    const details = await getCachedGameDetails(gameId);
    if (!details) return null;
    const status = classifyGameStatus(details.statusGroup);
    const [stats, preferences, headToHead] = await Promise.all([
      status === 'scheduled'
        ? Promise.resolve(null)
        : getCachedGameStats(gameId, status).catch((err) => {
            this.logger.warn(`Failed to load stats ${gameId}: ${getErrorMessage(err)}`);
            return null;
          }),
      getDashboardPreferences(telegramUserId).catch(() => null),
      this.getHeadToHead(gameId),
    ]);
    const favoriteTeamIds = new Set<number>((preferences?.favoriteTeams ?? []).map((t) => t.id));
    const game = toDashboardGame({ game: details, details, stats, favoriteTeamIds });
    return { ...toGameDetail(game, details, stats), ...(headToHead ? { headToHead } : {}) };
  }

  private async getHeadToHead(gameId: number): Promise<HeadToHead | null> {
    return this.headToHeadCache
      .get(`${gameId}`, PROFILE_TTL_MS, async () => toHeadToHead(await getHeadToHead(gameId)) ?? null)
      .catch((err) => {
        this.logger.warn(`Failed to load head-to-head ${gameId}: ${getErrorMessage(err)}`);
        return null;
      });
  }

  async getTeam(teamId: number): Promise<TeamDetailResponse | null> {
    return this.teamCache.get(`${teamId}`, PROFILE_TTL_MS, async () => {
      const [team, results, fixtures, squad] = await Promise.all([
        getCompetitorDetails(teamId),
        getCompetitorGames(teamId, 'results').catch(() => []),
        getCompetitorGames(teamId, 'fixtures').catch(() => []),
        getCompetitorSquad(teamId).catch(() => []),
      ]);
      return team ? toTeamDetail({ team, results, fixtures, squad }) : null;
    });
  }

  async getPlayer(athleteId: number): Promise<PlayerDetailResponse | null> {
    return this.playerCache.get(`${athleteId}`, PROFILE_TTL_MS, async () => {
      const athlete = await getAthleteDetails(athleteId);
      return athlete ? toPlayerDetail(athlete) : null;
    });
  }

  async getCompetition(competitionId: number): Promise<CompetitionDetailResponse | null> {
    const competition = COMPETITIONS.find((c) => c.id === competitionId);
    if (!competition) return null;
    return this.competitionCache.get(
      `${competitionId}`,
      (competition) => (competition?.tables.some((t) => t.rows.some((r) => r.isLive)) ? LIVE_COMPETITION_TTL_MS : COMPETITION_TTL_MS),
      async () => {
        const [standings, brackets] = await Promise.all([
          getStandings(competitionId).catch((err) => {
            this.logger.warn(`Failed to load standings ${competitionId}: ${getErrorMessage(err)}`);
            return null;
          }),
          getBrackets(competitionId).catch((err) => {
            this.logger.warn(`Failed to load brackets ${competitionId}: ${getErrorMessage(err)}`);
            return [];
          }),
        ]);
        const { tables, zones } = toStandingsTables(standings);
        return { id: competitionId, name: getCompetitionName(competitionId), icon: competition.icon, tables, zones, knockout: toKnockoutStages(brackets) };
      },
    );
  }
}
