import { z } from 'zod';
import { generateCompetitionMatchesString } from '@features/coach/utils';
import { getCompetitionMatches } from '@services/scores-365';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const competitionMatchesConfig: ToolConfig = {
  name: 'competition_matches',
  description: 'Get upcoming matches and fixtures for a specific football competition',
  schema: z.object({
    competitionId: z.number().describe('The ID of the competition to get matches for'),
  }),
  keywords: ['fixtures', 'upcoming', 'matches', 'schedule', 'next games', 'when', 'calendar'],
  instructions:
    'Use this tool when users want to see upcoming matches, fixtures, or schedules for a specific football competition. Perfect for questions like "When is the next Premier League match?" or "Show me upcoming fixtures".',
};

export class CompetitionMatchesTool implements ToolInstance {
  getName(): string {
    return competitionMatchesConfig.name;
  }

  getDescription(): string {
    return competitionMatchesConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return competitionMatchesConfig.schema;
  }

  getKeywords(): string[] {
    return competitionMatchesConfig.keywords;
  }

  getInstructions(): string {
    return competitionMatchesConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<string> {
    const { competitionId } = context.parameters;

    if (!competitionId) {
      throw new Error('Competition ID parameter is required for competition matches');
    }

    try {
      const matchesData = await getCompetitionMatches(competitionId);
      if (!matchesData?.matches?.length) {
        return `No upcoming matches found for competition ID ${competitionId}.`;
      }

      return generateCompetitionMatchesString(matchesData);
    } catch (error) {
      console.error('Error fetching competition matches:', error);
      throw new Error(`Failed to fetch competition matches: ${error.message}`);
    }
  }
}
