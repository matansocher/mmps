import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { generateMatchResultsString } from '@features/coach/utils';
import { getCompetitions, getMatchesSummaryDetails } from '@services/scores-365';

const schema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format to get match results for'),
  competitionIds: z.array(z.number()).optional().describe('Optional array of competition IDs to filter results'),
});

async function runner({ date, competitionIds }: z.infer<typeof schema>) {
  const competitions = await getCompetitions();
  if (!competitions?.length) {
    return 'No competitions available at the moment.';
  }

  const summaryDetails = await getMatchesSummaryDetails(competitions, date);
  if (!summaryDetails?.length) {
    return `No matches found for ${date}.`;
  }

  // Filter by competition IDs if provided
  const filteredSummary = competitionIds?.length ? summaryDetails.filter((summary) => competitionIds.includes(summary.competition.id)) : summaryDetails;

  if (!filteredSummary.length) {
    return `No matches found for the specified competitions on ${date}.`;
  }

  return generateMatchResultsString(filteredSummary);
}

export const matchSummaryTool = tool(runner, {
  name: 'match_summary',
  description: 'Get football match results and summaries for a specific date',
  schema,
});
