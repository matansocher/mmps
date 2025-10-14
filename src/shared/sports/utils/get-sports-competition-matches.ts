import { CompetitionDetails, getCompetitionMatches } from '@services/scores-365';
import { competitionMatchesCacheService } from '../cache';

export async function getSportsCompetitionMatches(competitionId: number): Promise<CompetitionDetails | null> {
  let competitionMatches = competitionMatchesCacheService.getCompetitionMatches(competitionId);
  if (!competitionMatches) {
    competitionMatches = await getCompetitionMatches(competitionId);
    if (competitionMatches?.matches?.length) {
      competitionMatchesCacheService.saveCompetitionMatches(competitionId, competitionMatches);
    }
  }
  if (!competitionMatches?.matches?.length) {
    return null;
  }
  return competitionMatches;
}
