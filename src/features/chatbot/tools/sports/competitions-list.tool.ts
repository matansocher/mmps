import { z } from 'zod';
import { getCompetitions } from '@services/scores-365';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const competitionsListConfig: ToolConfig = {
  name: 'competitions_list',
  description: 'Get list of available football competitions and leagues',
  schema: z.object({}),
  keywords: ['competitions', 'leagues', 'tournaments', 'available', 'list', 'what leagues'],
  instructions:
    'Use this tool when users want to see what football competitions, leagues, or tournaments are available. Perfect for questions like "What leagues are available?" or "Show me all competitions".',
};

export class CompetitionsListTool implements ToolInstance {
  getName(): string {
    return competitionsListConfig.name;
  }

  getDescription(): string {
    return competitionsListConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return competitionsListConfig.schema;
  }

  getKeywords(): string[] {
    return competitionsListConfig.keywords;
  }

  getInstructions(): string {
    return competitionsListConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<string> {
    try {
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
    } catch (error) {
      console.error('Error fetching competitions:', error);
      throw new Error(`Failed to fetch competitions: ${error.message}`);
    }
  }
}
