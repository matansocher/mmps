import { CompetitionTableDetails, getCompetitionTable } from '@services/scores-365';
import { competitionTableCacheService } from '../cache';

export async function getSportsCompetitionTable(competitionId: number): Promise<CompetitionTableDetails | null> {
  let competitionTableDetails = competitionTableCacheService.getCompetitionTable(competitionId);
  if (!competitionTableDetails) {
    competitionTableDetails = await getCompetitionTable(competitionId);
    if (competitionTableDetails?.competitionTable?.length) {
      competitionTableCacheService.saveCompetitionTable(competitionId, competitionTableDetails);
    }
  }
  if (!competitionTableDetails?.competitionTable?.length) {
    return null;
  }
  return competitionTableDetails;
}
