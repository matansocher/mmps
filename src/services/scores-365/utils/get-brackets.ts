import type { ScoresBracket } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { englishQueryParams } from './english-query-params';
import { scores365Get } from './scores-365-get';

export async function getBrackets(competitionId: number): Promise<ScoresBracket[]> {
  const res = await scores365Get<{ brackets?: ScoresBracket[] }>(`${SCORES_365_API_URL}/brackets/?${englishQueryParams({ competitions: `${competitionId}` })}`);
  return res.data?.brackets ?? [];
}
