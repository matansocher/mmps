import type { ScoresStandings } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { scoresQueryParams } from './query-params';
import { scores365Get } from './scores-365-get';

export async function getStandings(competitionId: number, langId?: number): Promise<ScoresStandings | null> {
  const res = await scores365Get<{ standings?: ScoresStandings[] }>(`${SCORES_365_API_URL}/standings/?${scoresQueryParams({ competitions: `${competitionId}` }, langId)}`);
  return res.data?.standings?.[0] ?? null;
}
