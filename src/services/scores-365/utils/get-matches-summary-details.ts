import { getCompetitions, getMatchesForCompetition } from '.';
import { CompetitionDetails } from '../interface';

export async function getMatchesSummaryDetails(dateString: string): Promise<CompetitionDetails[]> {
  const competitions = await getCompetitions();
  if (!competitions?.length) {
    this.logger.error(`${this.getMatchesSummaryDetails.name} - error - could not get competitions`);
    return;
  }
  const competitionsWithMatches = await Promise.all(competitions.map((competition) => getMatchesForCompetition(competition, dateString)));
  if (!competitionsWithMatches?.length) {
    this.logger.error(`${this.getMatchesSummaryDetails.name} - error - could not get matches`);
    return;
  }

  const competitionsWithMatchesFiltered = competitionsWithMatches.filter(({ matches }) => matches?.length);
  if (!competitionsWithMatchesFiltered?.length) {
    this.logger.log(`${this.getMatchesSummaryDetails.name} - no competitions with matches found`);
    return [];
  }

  return competitionsWithMatchesFiltered;
}
