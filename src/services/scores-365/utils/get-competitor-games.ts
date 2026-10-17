import type { ScoresGame } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { englishQueryParams } from './english-query-params';
import { scores365Get } from './scores-365-get';

export async function getCompetitorGames(competitorId: number, kind: 'results' | 'fixtures'): Promise<ScoresGame[]> {
  const res = await scores365Get<{ games?: ScoresGame[] }>(`${SCORES_365_API_URL}/games/${kind}/?${englishQueryParams({ competitors: `${competitorId}`, showOdds: 'false' })}`);
  return res.data?.games ?? [];
}
