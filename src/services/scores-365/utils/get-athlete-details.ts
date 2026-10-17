import type { ScoresAthleteDetails } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { scoresQueryParams } from './query-params';
import { scores365Get } from './scores-365-get';

export async function getAthleteDetails(athleteId: number, langId?: number): Promise<ScoresAthleteDetails | null> {
  const res = await scores365Get<{ athletes?: ScoresAthleteDetails[] }>(`${SCORES_365_API_URL}/athletes/?${scoresQueryParams({ athletes: `${athleteId}`, fullDetails: 'true' }, langId)}`);
  return res.data?.athletes?.[0] ?? null;
}
