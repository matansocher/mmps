import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../../services/scores-365/scores-365.config';
import type { SquadPlayer, TeamDetailResponse } from './dto';

const logger = new Logger('CoachTeamFetcher');

const POSITION_MAP: Record<number, string> = { 1: 'GK', 2: 'DF', 3: 'MF', 4: 'FW' };

type RawCompetitor = {
  id: number;
  name: string;
  symbolicName?: string;
  imageVersion?: number;
  mainCompetitionId?: number;
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

export async function fetchTeamDetail(teamId: number): Promise<TeamDetailResponse | null> {
  try {
    const params = { ...baseParams(), competitors: String(teamId) };
    const [compRes, squadRes] = await Promise.all([
      axios.get(`${SCORES_365_API_URL}/competitors?${new URLSearchParams(params)}`).catch(() => null),
      axios.get(`${SCORES_365_API_URL}/squads/?${new URLSearchParams(params)}`).catch(() => null),
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
      squad,
    };
  } catch (err) {
    logger.error(`fetchTeamDetail failed for ${teamId}: ${err}`);
    return null;
  }
}
