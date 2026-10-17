import { format } from 'date-fns';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { ScoresGame } from '../interface';
import { APP_TYPE_ID, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';
import { scores365Get } from './scores-365-get';

export type GetGamesByDateOptions = {
  readonly date: Date;
  readonly competitionIds?: readonly number[];
  readonly competitorIds?: readonly number[];
};

export async function getGamesByDate({ date, competitionIds = [], competitorIds = [] }: GetGamesByDateOptions): Promise<ScoresGame[]> {
  if (!competitionIds.length && !competitorIds.length) return [];
  // Format: "DD/MM/YYYY"
  const day = format(date, 'dd/MM/yyyy');
  const queryParams = {
    appTypeId: `${APP_TYPE_ID}`,
    langId: `${LANGUAGE_ID}`,
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: `${COUNTRY_ID}`,
    startDate: day,
    endDate: day,
    showOdds: 'false',
    ...(competitionIds.length ? { competitions: competitionIds.join(',') } : {}),
    ...(competitorIds.length ? { competitors: competitorIds.join(',') } : {}),
  };
  const res = await scores365Get<{ games?: ScoresGame[] }>(`${SCORES_365_API_URL}/games/?${new URLSearchParams(queryParams)}`);
  return res.data?.games ?? [];
}
