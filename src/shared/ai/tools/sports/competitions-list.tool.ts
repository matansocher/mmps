import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCompetitions } from '@services/scores-365';

const schema = z.object({});

async function runner() {
  const competitions = await getCompetitions();
  if (!competitions?.length) {
    return 'No competitions are currently available.';
  }

  // Format the competitions list
  let result = `**Available Football Competitions**\n\n`;

  competitions.forEach((competition) => {
    result += `${competition.icon || '⚽'} **${competition.name}** (ID: ${competition.id})`;

    if (competition.hasTable) {
      result += ` 📊`;
    }

    result += '\n';
  });

  result += '\n📊 = Has league table available\n';
  result += '\n💡 **Tip**: You can ask me for:\n';
  result += '• Match results: "Show me today\'s football results"\n';
  result += '• League tables: "Show me the Premier League table"\n';
  result += '• Upcoming matches: "When are the next matches?"\n';

  return result;
}

export const competitionsListTool = tool(runner, {
  name: 'competitions_list',
  description: 'Get list of available football competitions and leagues',
  schema,
});
