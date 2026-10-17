import type { ScoresStandings } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { englishQueryParams } from './english-query-params';
import { scores365Get } from './scores-365-get';

export async function getStandings(competitionId: number): Promise<ScoresStandings | null> {
  const res = await scores365Get<{ standings?: ScoresStandings[] }>(`${SCORES_365_API_URL}/standings/?${englishQueryParams({ competitions: `${competitionId}` })}`);
  return res.data?.standings?.[0] ?? null;
}
