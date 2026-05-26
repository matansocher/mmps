import { Competition, getCompetitions } from '@services/scores-365';
import { competitionsCacheService } from '../cache';

export async function getSportsCompetitions(): Promise<Competition[] | null> {
  let competitions = await competitionsCacheService.getCompetitions();
  if (!competitions) {
    competitions = await getCompetitions();
    if (competitions?.length) {
      await competitionsCacheService.saveCompetitions(competitions);
    }
  }
  if (!competitions?.length) {
    return null;
  }
  return competitions;
}
