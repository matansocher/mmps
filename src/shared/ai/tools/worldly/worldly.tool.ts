import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getWorldlySummary } from './utils';

const schema = z.object({});

async function runner() {
  return getWorldlySummary();
}

export const worldlyTool = tool(runner, {
  name: 'worldly_summary',
  description:
    'Get a summary of Worldly game statistics including top players, correct answer percentages, and winning streaks (both all-time and weekly). Use this when asked about Worldly game performance, player rankings, or game statistics.',
  schema,
});
