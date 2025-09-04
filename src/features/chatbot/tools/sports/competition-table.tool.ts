import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCompetitionTable } from '@services/scores-365';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

const schema = z.object({
  competitionId: z.number().describe('The ID of the competition to get the table for'),
});

async function runner({ competitionId }: z.infer<typeof schema>) {
  const tableDetails = await getCompetitionTable(competitionId);
  if (!tableDetails?.competitionTable?.length) {
    return `No table data available for competition ID ${competitionId}.`;
  }

  let result = `**${tableDetails.competition.name} - League Table**\n\n`;

  result += '```\n';
  result += 'Pos | Team                    | GP | Pts\n';
  result += '----|-------------------------|----|----||\n';

  tableDetails.competitionTable.forEach((row, index) => {
    const position = (index + 1).toString().padStart(2, ' ');
    const teamName = row.competitor.name.length > 23 ? row.competitor.name.substring(0, 20) + '...' : row.competitor.name.padEnd(23, ' ');
    const gamesPlayed = row.gamesPlayed.toString().padStart(2, ' ');
    const points = row.points.toString().padStart(3, ' ');

    result += `${position}  | ${teamName} | ${gamesPlayed} | ${points}\n`;
  });

  result += '```\n';

  // Add some context
  result += `\n📊 **GP** = Games Played, **Pts** = Points\n`;
  result += `🏆 **${tableDetails.competitionTable[0]?.competitor.name}** is currently leading with **${tableDetails.competitionTable[0]?.points} points**`;

  return result;
}

export const competitionTableTool = tool(runner, {
  name: 'competition_table',
  description: 'Get football league table/standings for a specific competition',
  schema,
});
