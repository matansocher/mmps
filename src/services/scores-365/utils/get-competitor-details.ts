import type { ScoresCompetitorDetails } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { englishQueryParams } from './english-query-params';
import { scores365Get } from './scores-365-get';

export async function getCompetitorDetails(competitorId: number): Promise<ScoresCompetitorDetails | null> {
  const res = await scores365Get<{ competitors?: ScoresCompetitorDetails[] }>(`${SCORES_365_API_URL}/competitors/?${englishQueryParams({ competitors: `${competitorId}` })}`);
  return res.data?.competitors?.[0] ?? null;
}
