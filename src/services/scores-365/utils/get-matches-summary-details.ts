import { getCompetitions, getMatchesForCompetition } from '.';
import { CompetitionDetails } from '../interface';

export async function getMatchesSummaryDetails(dateString: string): Promise<CompetitionDetails[]> {
  const competitions = await getCompetitions();
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
