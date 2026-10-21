import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getSportsMatchesSummary, toMatchCardGroups } from '@shared/sports';

const schema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format to get match results for'),
});

async function runner({ date }: z.infer<typeof schema>) {
  const summaryDetails = await getSportsMatchesSummary(date);

  if (!summaryDetails?.length) {
    return `No matches found for ${date}.`;
  }

  return { competitions: toMatchCardGroups(summaryDetails) };
}

export const matchSummaryTool = tool(runner, {
  name: 'match_summary',
  description: 'Get football matches for a date across top competitions: results, live scores and upcoming kickoffs (times in Israel time). The matches are also sent to the user as an image, so do not list them all - summarize the highlights.',
  schema,
});
