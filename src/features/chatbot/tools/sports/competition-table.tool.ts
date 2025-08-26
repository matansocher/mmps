import { z } from 'zod';
import { getCompetitionTable } from '@services/scores-365';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const competitionTableConfig: ToolConfig = {
  name: 'competition_table',
  description: 'Get football league table/standings for a specific competition',
  schema: z.object({
    competitionId: z.number().describe('The ID of the competition to get the table for'),
  }),
  keywords: ['table', 'standings', 'league', 'position', 'points', 'ranking', 'leaderboard'],
  instructions:
    'Use this tool when users want to see league tables, standings, or team rankings for a specific football competition. Perfect for questions like "Show me the Premier League table" or "What are the current standings?".',
};

export class CompetitionTableTool implements ToolInstance {
  getName(): string {
    return competitionTableConfig.name;
  }

  getDescription(): string {
    return competitionTableConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return competitionTableConfig.schema;
  }

  getKeywords(): string[] {
    return competitionTableConfig.keywords;
  }

  getInstructions(): string {
    return competitionTableConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<string> {
    const { competitionId } = context.parameters;

    if (!competitionId) {
      throw new Error('Competition ID parameter is required for competition table');
    }

    try {
      const tableDetails = await getCompetitionTable(competitionId);
      if (!tableDetails?.competitionTable?.length) {
        return `No table data available for competition ID ${competitionId}.`;
      }

      // Format the table
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
    } catch (error) {
      console.error('Error fetching competition table:', error);
      throw new Error(`Failed to fetch competition table: ${error.message}`);
    }
  }
}
