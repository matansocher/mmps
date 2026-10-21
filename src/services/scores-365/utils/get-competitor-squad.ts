import type { ScoresSquadAthlete } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { scoresQueryParams } from './query-params';
import { scores365Get } from './scores-365-get';

export async function getCompetitorSquad(competitorId: number, langId?: number): Promise<ScoresSquadAthlete[]> {
  const res = await scores365Get<{ squads?: { athletes?: ScoresSquadAthlete[] }[] }>(`${SCORES_365_API_URL}/squads/?${scoresQueryParams({ competitors: `${competitorId}` }, langId)}`);
  return res.data?.squads?.[0]?.athletes ?? [];
}
