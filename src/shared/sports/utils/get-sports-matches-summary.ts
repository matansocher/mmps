import { CompetitionDetails, getMatchesSummaryDetails } from '@services/scores-365';
import { getSportsCompetitions } from '.';
import { matchesSummaryCacheService } from '../cache';

export async function getSportsMatchesSummary(date: string): Promise<CompetitionDetails[] | null> {
  let summaryDetails = matchesSummaryCacheService.getMatchesSummary(date);
  if (!summaryDetails?.length) {
    const competitions = await getSportsCompetitions();
    if (!competitions) {
      return null;
    }
    summaryDetails = await getMatchesSummaryDetails(competitions, date);
    if (summaryDetails?.length) {
      matchesSummaryCacheService.saveMatchesSummary(date, summaryDetails);
    }
  }
  if (!summaryDetails?.length) {
    return null;
  }
  return summaryDetails;
}
