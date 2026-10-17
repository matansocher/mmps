import type { ScoresHeadToHead } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { englishQueryParams } from './english-query-params';
import { scores365Get } from './scores-365-get';

export async function getHeadToHead(gameId: number): Promise<ScoresHeadToHead | null> {
  const res = await scores365Get<{ game?: ScoresHeadToHead }>(`${SCORES_365_API_URL}/games/h2h/?${englishQueryParams({ gameId: `${gameId}` })}`);
  return res.data?.game ?? null;
}
