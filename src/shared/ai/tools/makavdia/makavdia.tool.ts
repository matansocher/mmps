import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getMakavdiaResults } from '@services/scores-365';

const schema = z.object({});

async function runner() {
  const makavdiaResults = await getMakavdiaResults();

  if (!makavdiaResults?.length) {
    return `לא נמצאו משחקים`;
  }

  return makavdiaResults;
}

export const makavdiaTool = tool(runner, {
  name: 'makavdia',
  description:
    'Get the latest 5 games and comprehensive statistics for NBA player Deni Avdija. Returns detailed data including game results, opponent teams, scores, venue information, game times, player performance stats, and more for each of the last 5 matches.',
  schema,
});
