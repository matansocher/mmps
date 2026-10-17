import type { ScoresAthleteDetails } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { englishQueryParams } from './english-query-params';
import { scores365Get } from './scores-365-get';

export async function getAthleteDetails(athleteId: number): Promise<ScoresAthleteDetails | null> {
  const res = await scores365Get<{ athletes?: ScoresAthleteDetails[] }>(`${SCORES_365_API_URL}/athletes/?${englishQueryParams({ athletes: `${athleteId}`, fullDetails: 'true' })}`);
  return res.data?.athletes?.[0] ?? null;
}
