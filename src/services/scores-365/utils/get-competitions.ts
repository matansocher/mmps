import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { Competition } from '../interface';
import { COMPETITIONS, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';

export async function getCompetitions(): Promise<Competition[]> {
  const results = await Promise.all(
    COMPETITIONS.map(async (competition) => {
      const queryParams = { competitions: competition.id.toString(), langId: `${LANGUAGE_ID}`, timezoneName: DEFAULT_TIMEZONE };
      const result = await axios.get(`${SCORES_365_API_URL}/competitions?${new URLSearchParams(queryParams)}`);
      const relevantCompetition = result.data?.competitions?.find((c) => c.id === competition.id);
      if (!relevantCompetition) {
        return undefined;
      }
      return { id: relevantCompetition.id, name: relevantCompetition.name, icon: competition.icon, hasTable: competition.hasTable } as unknown as Competition;
    }),
  );
  return results.filter(Boolean);
}
