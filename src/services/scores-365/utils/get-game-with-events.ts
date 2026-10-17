import { DEFAULT_TIMEZONE } from '@core/config';
import type { ScoresGameDetails } from '../interface';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';
import { scores365Get } from './scores-365-get';

export async function getGameWithEvents(gameId: number): Promise<ScoresGameDetails | null> {
  const queryParams = {
    appTypeId: `${APP_TYPE_ID}`,
    langId: `${LANGUAGE_ID}`,
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: `${COUNTRY_ID}`,
    gameId: `${gameId}`,
  };
  const res = await scores365Get<{ game?: ScoresGameDetails }>(`${SCORES_365_API_URL}/game/?${new URLSearchParams(queryParams)}`);
  return res.data?.game ?? null;
}
