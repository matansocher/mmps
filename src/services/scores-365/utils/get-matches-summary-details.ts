import { Logger } from '@core/utils';
import { getMatchesForCompetition } from '.';
import { Competition, CompetitionDetails } from '../interface';

const logger = new Logger('Scores365');

export async function getMatchesSummaryDetails(competitions: Competition[], dateString: string): Promise<CompetitionDetails[]> {
  if (!competitions?.length) {
    return;
  }
  // One slow or failing competition shouldn't drop the whole summary; only fail if all of them do.
  const results = await Promise.allSettled(competitions.map((competition) => getMatchesForCompetition(competition, dateString)));
  const failed = results.flatMap((result, i) => (result.status === 'rejected' ? [{ competition: competitions[i], reason: result.reason }] : []));
  if (failed.length === results.length) {
    throw failed[0].reason;
  }
  failed.forEach(({ competition, reason }) => logger.warn(`Skipping competition ${competition.id} in matches summary: ${reason}`));

  const competitionsWithMatches = results.filter((result): result is PromiseFulfilledResult<CompetitionDetails> => result.status === 'fulfilled').map(({ value }) => value);
  return competitionsWithMatches.filter(({ matches }) => matches?.length);
}
