import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { COMPETITION_IDS_MAP } from '@services/scores-365';
import { generateCompetitionMatchesString, getSportsCompetitionMatches } from '@shared/sports';
import { competitionSchema } from './competition-schema';

const schema = z.object({
  competition: competitionSchema,
});

async function runner({ competition }: z.infer<typeof schema>) {
  const matchesData = await getSportsCompetitionMatches(COMPETITION_IDS_MAP[competition]);

  if (!matchesData?.matches?.length) {
    return `No upcoming matches found for ${competition}.`;
  }

  return generateCompetitionMatchesString(matchesData);
}

export const competitionMatchesTool = tool(runner, {
  name: 'competition_matches',
  description: 'Get upcoming matches and fixtures for a specific football competition',
  schema,
});
