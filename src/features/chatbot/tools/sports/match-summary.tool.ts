import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCompetitions, getMatchesSummaryDetails } from '@services/scores-365';
import { generateMatchResultsString } from '@shared/coach';

const schema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format to get match results for'),
});

async function runner({ date }: z.infer<typeof schema>) {
  const competitions = await getCompetitions();
  if (!competitions?.length) {
    return 'No competitions available at the moment.';
  }

  const summaryDetails = await getMatchesSummaryDetails(competitions, date);
  if (!summaryDetails?.length) {
    return `No matches found for ${date}.`;
  }

  return generateMatchResultsString(summaryDetails);
}

export const matchSummaryTool = tool(runner, {
  name: 'match_summary',
  description: 'Get football match results and summaries for a specific date. use the formatted text returned from this tool since it contains markdown for better readability.',
  schema,
});
