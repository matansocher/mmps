import type { ScoresSquadAthlete } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { englishQueryParams } from './english-query-params';
import { scores365Get } from './scores-365-get';

export async function getCompetitorSquad(competitorId: number): Promise<ScoresSquadAthlete[]> {
  const res = await scores365Get<{ squads?: { athletes?: ScoresSquadAthlete[] }[] }>(`${SCORES_365_API_URL}/squads/?${englishQueryParams({ competitors: `${competitorId}` })}`);
  return res.data?.squads?.[0]?.athletes ?? [];
}
