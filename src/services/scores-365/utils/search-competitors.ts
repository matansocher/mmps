import { DEFAULT_TIMEZONE } from '@core/config';
import type { ScoresCompetitorSearchResult } from '../interface';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';
import { scores365Get } from './scores-365-get';

const FOOTBALL_SPORT_ID = 1;

export async function searchCompetitors(query: string): Promise<ScoresCompetitorSearchResult[]> {
  const queryParams = {
    appTypeId: `${APP_TYPE_ID}`,
    langId: `${LANGUAGE_ID}`,
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: `${COUNTRY_ID}`,
    query,
    filter: 'competitors',
    sportId: `${FOOTBALL_SPORT_ID}`,
  };
  const res = await scores365Get<{ competitors?: ScoresCompetitorSearchResult[] }>(`${SCORES_365_API_URL}/search/?${new URLSearchParams(queryParams)}`);
  return (res.data?.competitors ?? []).filter((c) => c.sportId === FOOTBALL_SPORT_ID);
}
