import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { COMPETITION_IDS_MAP } from '@services/scores-365';
import { getSportsCompetitionTable } from '@shared/sports';
import { competitionSchema } from './competition-schema';

const schema = z.object({
  competition: competitionSchema,
});

async function runner({ competition }: z.infer<typeof schema>) {
  const tableDetails = await getSportsCompetitionTable(COMPETITION_IDS_MAP[competition]);

  if (!tableDetails?.competitionTable?.length) {
    return `No table data available for ${competition}.`;
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
