import type { ScoresBracket } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { scoresQueryParams } from './query-params';
import { scores365Get } from './scores-365-get';

export async function getBrackets(competitionId: number, langId?: number): Promise<ScoresBracket[]> {
  const res = await scores365Get<{ brackets?: ScoresBracket[] }>(`${SCORES_365_API_URL}/brackets/?${scoresQueryParams({ competitions: `${competitionId}` }, langId)}`);
  return res.data?.brackets ?? [];
}
