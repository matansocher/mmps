import { DEFAULT_TIMEZONE } from '@core/config';
import type { ScoresGameStat } from '../interface';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';
import { scores365Get } from './scores-365-get';

export async function getGameStats(gameId: number): Promise<ScoresGameStat[]> {
  const queryParams = {
    appTypeId: `${APP_TYPE_ID}`,
    langId: `${LANGUAGE_ID}`,
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: `${COUNTRY_ID}`,
    games: `${gameId}`,
  };
  const res = await scores365Get<{ statistics?: ScoresGameStat[] }>(`${SCORES_365_API_URL}/game/stats/?${new URLSearchParams(queryParams)}`);
  return res.data?.statistics ?? [];
}
