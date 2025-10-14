import { Competition, getCompetitions } from '@services/scores-365';
import { competitionsCacheService } from '../cache';

export async function getSportsCompetitions(): Promise<Competition[] | null> {
  let competitions = competitionsCacheService.getCompetitions();
  if (!competitions) {
    competitions = await getCompetitions();
    if (competitions?.length) {
      competitionsCacheService.saveCompetitions(competitions);
    }
  }
  if (!competitions?.length) {
    return null;
  }
  return competitions;
}
