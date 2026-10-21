import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { COMPETITION_IDS_MAP } from '@services/scores-365';
import { getSportsCompetitionMatches, toMatchCardGroups } from '@shared/sports';
import { competitionSchema } from './competition-schema';

const schema = z.object({
  competition: competitionSchema,
});

async function runner({ competition }: z.infer<typeof schema>) {
  const matchesData = await getSportsCompetitionMatches(COMPETITION_IDS_MAP[competition]);

  if (!matchesData?.matches?.length) {
    return `No upcoming matches found for ${competition}.`;
  }

  return { competitions: toMatchCardGroups([matchesData]) };
}

export const competitionMatchesTool = tool(runner, {
  name: 'competition_matches',
  description: 'Get upcoming fixtures for a football competition (times in Israel time). The fixtures are also sent to the user as an image, so do not list them all - mention only the matches relevant to the question.',
  schema,
});
