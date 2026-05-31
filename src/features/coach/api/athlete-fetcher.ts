import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Logger } from '@core/utils';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '@services/scores-365';
import type { AthleteDetailResponse } from './dto';

const logger = new Logger('CoachAthleteFetcher');

const POSITION_MAP: Record<number, string> = { 1: 'GK', 2: 'DF', 3: 'MF', 4: 'FW' };

type RawAthlete = {
  id: number;
  name: string;
  imageVersion?: number;
  age?: number;
  height?: number;
  jerseyNum?: number;
  clubId?: number;
  clubName?: string;
  nationality?: { name?: string };
  position?: { id: number; name?: string };
};

function mapPosition(positionId?: number): string {
  if (!positionId) return 'MF';
  return POSITION_MAP[positionId] ?? 'MF';
}

export async function fetchAthleteDetail(athleteId: number): Promise<AthleteDetailResponse | null> {
  try {
    const params = {
      appTypeId: String(APP_TYPE_ID),
      langId: String(LANGUAGE_ID),
      timezoneName: DEFAULT_TIMEZONE,
      userCountryId: String(COUNTRY_ID),
      athletes: String(athleteId),
    };
    const res = await axios.get(`${SCORES_365_API_URL}/athletes?${new URLSearchParams(params)}`);
    const athlete: RawAthlete | undefined = res?.data?.athletes?.[0];
    if (!athlete) return null;

    return {
      athleteId: athlete.id,
      name: athlete.name,
      position: mapPosition(athlete.position?.id),
      positionName: athlete.position?.name,
      age: athlete.age && athlete.age > 0 ? athlete.age : undefined,
      height: athlete.height && athlete.height > 0 ? athlete.height : undefined,
      jerseyNumber: athlete.jerseyNum && athlete.jerseyNum > 0 ? athlete.jerseyNum : undefined,
      nationalityName: athlete.nationality?.name,
      clubId: athlete.clubId && athlete.clubId > 0 ? athlete.clubId : undefined,
      clubName: athlete.clubName,
      imageVersion: athlete.imageVersion,
    };
  } catch (err) {
    logger.error(`fetchAthleteDetail failed for ${athleteId}: ${err}`);
    return null;
  }
}
