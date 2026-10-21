import type { ScoresGame } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { scoresQueryParams } from './query-params';
import { scores365Get } from './scores-365-get';

export async function getCompetitorGames(competitorId: number, kind: 'results' | 'fixtures', langId?: number): Promise<ScoresGame[]> {
  const res = await scores365Get<{ games?: ScoresGame[] }>(`${SCORES_365_API_URL}/games/${kind}/?${scoresQueryParams({ competitors: `${competitorId}`, showOdds: 'false' }, langId)}`);
  return res.data?.games ?? [];
}
