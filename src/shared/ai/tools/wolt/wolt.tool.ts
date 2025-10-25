import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getWoltSummary } from './utils';

const schema = z.object({});

async function runner() {
  return getWoltSummary();
}

export const woltTool = tool(runner, {
  name: 'wolt_summary',
  description:
    'Get a summary of Wolt food delivery statistics including top users and top restaurants for the current week. Use this when asked about Wolt usage, popular restaurants, or food delivery trends.',
  schema,
});
