import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { generateCompetitionMatchesString } from '@features/coach/utils';
import { getCompetitionMatches } from '@services/scores-365';

const schema = z.object({
  competitionId: z.number().describe('The ID of the competition to get matches for'),
});

async function runner({ competitionId }: z.infer<typeof schema>) {
  const matchesData = await getCompetitionMatches(competitionId);
  if (!matchesData?.matches?.length) {
    return `No upcoming matches found for competition ID ${competitionId}.`;
  }

  return generateCompetitionMatchesString(matchesData);
}

export const competitionMatchesTool = tool(runner, {
  name: 'competitionMatches',
  description: 'Get upcoming matches and fixtures for a specific football competition',
  schema,
});
