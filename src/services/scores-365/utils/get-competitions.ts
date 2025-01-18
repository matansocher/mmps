import axios from 'axios';
import { pick as _pick } from 'lodash';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Competition } from '../interface';
import { COMPETITIONS, SCORES_365_API_URL } from '../scores-365.config';

export async function getCompetitions(): Promise<Competition[]> {
  const competitionIds = COMPETITIONS.map((c) => c.id);
  const results = await Promise.all(
    competitionIds.map(async (competitionId) => {
      const queryParams = { competitions: competitionId.toString(), langId: '2', timezoneName: DEFAULT_TIMEZONE };
      const result = await axios.get(`${SCORES_365_API_URL}/competitions?${new URLSearchParams(queryParams)}`);
      const relevantCompetition = result.data?.competitions?.find((c) => c.id === competitionId);
      return relevantCompetition ? (_pick(relevantCompetition, ['id', 'name', 'shortName', 'nameForURL']) as Competition) : undefined;
    }),
  );
  return results.filter(Boolean);
}
