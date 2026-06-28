import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '@services/scores-365';
import type { MatchStatus, SquadPlayer, TeamDetailResponse, TeamRecentMatch } from './dto';

const logger = new Logger('CoachTeamFetcher');

const POSITION_MAP: Record<number, string> = { 1: 'GK', 2: 'DF', 3: 'MF', 4: 'FW' };

const RECENT_MATCH_LIMIT = 5;

type RawCompetitor = {
  id: number;
  name: string;
  symbolicName?: string;
  imageVersion?: number;
  mainCompetitionId?: number;
  color?: string;
  awayColor?: string;
  country?: { name?: string };
};

type RawAthlete = {
  id: number;
  name: string;
  nameForURL?: string;
  imageVersion?: number;
  age?: number;
  jerseyNum?: number;
  clubId?: number;
  position?: { id: number; name?: string };
};

type RawGameCompetitor = {
  id: number;
  name: string;
  symbolicName?: string;
  score?: number;
};

type RawGame = {
  id: number;
  startTime: string;
  competitionId: number;
  statusGroup?: number;
  gameTime?: number;
  homeCompetitor: RawGameCompetitor;
  awayCompetitor: RawGameCompetitor;
};

function baseParams(): Record<string, string> {
  return {
    appTypeId: String(APP_TYPE_ID),
    langId: String(LANGUAGE_ID),
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: String(COUNTRY_ID),
  };
}

function mapPosition(positionId?: number): string {
  if (!positionId) return 'MF';
  return POSITION_MAP[positionId] ?? 'MF';
}

function toSquadPlayer(a: RawAthlete): SquadPlayer {
  return {
    athleteId: a.id,
    name: a.name,
    position: mapPosition(a.position?.id),
    positionName: a.position?.name,
    age: a.age && a.age > 0 ? a.age : undefined,
    jerseyNumber: a.jerseyNum && a.jerseyNum > 0 ? a.jerseyNum : undefined,
    clubId: a.clubId && a.clubId > 0 ? a.clubId : undefined,
    imageVersion: a.imageVersion,
  };
}

function gameStatus(g: RawGame): MatchStatus {
  if (g.statusGroup === 3) return 'live';
  if (g.statusGroup === 4) return 'finished';
  return 'scheduled';
}

function toRecentMatch(g: RawGame, teamId: number): TeamRecentMatch | null {
  const status = gameStatus(g);
  if (status !== 'finished') return null;
  const homeScore = g.homeCompetitor.score ?? -1;
  const awayScore = g.awayCompetitor.score ?? -1;
  if (homeScore < 0 || awayScore < 0) return null;
  const isHome = g.homeCompetitor.id === teamId;
  const mine = isHome ? homeScore : awayScore;
  const theirs = isHome ? awayScore : homeScore;
  const outcome: TeamRecentMatch['outcome'] = mine > theirs ? 'W' : mine === theirs ? 'D' : 'L';
  return {
    id: g.id,
    home: { id: g.homeCompetitor.id, name: g.homeCompetitor.name, symbolicName: g.homeCompetitor.symbolicName },
    away: { id: g.awayCompetitor.id, name: g.awayCompetitor.name, symbolicName: g.awayCompetitor.symbolicName },
    status,
    startTime: g.startTime,
    score: { home: homeScore, away: awayScore },
    competitionId: g.competitionId,
    outcome,
  };
}

export async function fetchTeamRecentMatches(teamId: number): Promise<TeamRecentMatch[]> {
  try {
    const params = { ...baseParams(), competitors: String(teamId) };
    const resultsRes = await axios.get(`${SCORES_365_API_URL}/games/results/?${new URLSearchParams(params)}`).catch(() => null);
    const rawGames: RawGame[] = resultsRes?.data?.games ?? [];
    return rawGames
      .map((g) => toRecentMatch(g, teamId))
      .filter((m): m is TeamRecentMatch => m !== null)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, RECENT_MATCH_LIMIT);
  } catch (err) {
    logger.error(`fetchTeamRecentMatches failed for ${teamId}: ${err}`);
    return [];
  }
}

export async function fetchTeamDetail(teamId: number): Promise<TeamDetailResponse | null> {
  try {
    const params = { ...baseParams(), competitors: String(teamId) };
    const [compRes, squadRes, recentMatches] = await Promise.all([
      axios.get(`${SCORES_365_API_URL}/competitors?${new URLSearchParams(params)}`).catch(() => null),
      axios.get(`${SCORES_365_API_URL}/squads/?${new URLSearchParams(params)}`).catch(() => null),
      fetchTeamRecentMatches(teamId),
    ]);

    const competitor: RawCompetitor | undefined = compRes?.data?.competitors?.[0];
    if (!competitor) return null;

    const rawSquad: RawAthlete[] = squadRes?.data?.squads?.[0]?.athletes ?? [];
    const squad: SquadPlayer[] = rawSquad
      .filter((a) => (a.position?.id ?? 0) > 0)
      .map(toSquadPlayer);

    return {
      team: {
        id: competitor.id,
        name: competitor.name,
        symbolicName: competitor.symbolicName,
      },
      country: competitor.country?.name,
      mainCompetitionId: competitor.mainCompetitionId,
      imageVersion: competitor.imageVersion,
      color: competitor.color,
      awayColor: competitor.awayColor,
      recentMatches,
      squad,
    };
  } catch (err) {
    logger.error(`fetchTeamDetail failed for ${teamId}: ${err}`);
    return null;
  }
}
