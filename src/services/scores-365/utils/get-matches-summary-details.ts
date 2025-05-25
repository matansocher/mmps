import { getMatchesForCompetition } from '.';
import { Competition, CompetitionDetails } from '../interface';

export async function getMatchesSummaryDetails(competitions: Competition[], dateString: string): Promise<CompetitionDetails[]> {
  if (!competitions?.length) {
    return;
  }
  const competitionsWithMatches = await Promise.all(competitions.map((competition) => getMatchesForCompetition(competition, dateString)));
  if (!competitionsWithMatches?.length) {
    return;
  }

  const competitionsWithMatchesFiltered = competitionsWithMatches.filter(({ matches }) => matches?.length);
  if (!competitionsWithMatchesFiltered?.length) {
    return [];
  }

  return competitionsWithMatchesFiltered;
}
