import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { MakavdiaApiResponse, MakavdiaLastMatches } from '../interface';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';

export async function getMakavdiaResults(): Promise<MakavdiaLastMatches> {
  const queryParams = {
    appTypeId: `${APP_TYPE_ID}`,
    langId: `${LANGUAGE_ID}`,
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: `${COUNTRY_ID}`,
    athletes: `64366`,
    fullDetails: `true`,
    topBookmaker: `1`,
  };
  const result = await axios.get<MakavdiaApiResponse>(`${SCORES_365_API_URL}/athletes?${new URLSearchParams(queryParams)}`);
  const lastMatches = result?.data?.athletes[0]?.lastMatches || { games: [], headers: [] };
  return { games: lastMatches.games, headers: lastMatches.headers };
}
