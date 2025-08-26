import { z } from 'zod';
import { getCompetitions, getMatchesSummaryDetails } from '@services/scores-365';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const matchSummaryConfig: ToolConfig = {
  name: 'match_summary',
  description: 'Get football match results and summaries for a specific date',
  schema: z.object({
    date: z.string().describe('Date in YYYY-MM-DD format to get match results for'),
    competitionIds: z.array(z.number()).optional().describe('Optional array of competition IDs to filter results'),
  }),
  keywords: ['football', 'soccer', 'matches', 'results', 'scores', 'games', 'fixtures', 'summary'],
  instructions:
    'Use this tool when users want to see football match results, scores, or summaries for a specific date. Perfect for questions like "What were the football results today?" or "Show me yesterday\'s match scores".',
};

export class MatchSummaryTool implements ToolInstance {
  getName(): string {
    return matchSummaryConfig.name;
  }

  getDescription(): string {
    return matchSummaryConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return matchSummaryConfig.schema;
  }

  getKeywords(): string[] {
    return matchSummaryConfig.keywords;
  }

  getInstructions(): string {
    return matchSummaryConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<string> {
    const { date, competitionIds } = context.parameters;

    if (!date) {
      throw new Error('Date parameter is required for match summary');
    }

    try {
      const competitions = await getCompetitions();
      if (!competitions?.length) {
        return 'No competitions available at the moment.';
      }

      const summaryDetails = await getMatchesSummaryDetails(competitions, date);
      if (!summaryDetails?.length) {
        return `No matches found for ${date}.`;
      }

      // Filter by competition IDs if provided
      const filteredSummary = competitionIds?.length ? summaryDetails.filter((summary) => competitionIds.includes(summary.competition.id)) : summaryDetails;

      if (!filteredSummary.length) {
        return `No matches found for the specified competitions on ${date}.`;
      }

      // Format the results
      let result = `**Football Match Results for ${date}**\n\n`;

      filteredSummary.forEach((competitionDetail) => {
        result += `**${competitionDetail.competition.name}**\n`;

        competitionDetail.matches.forEach((match) => {
          const homeTeam = match.homeCompetitor.name;
          const awayTeam = match.awayCompetitor.name;
          const homeScore = match.homeCompetitor.score;
          const awayScore = match.awayCompetitor.score;
          const status = match.statusText;

          result += `• ${homeTeam} ${homeScore} - ${awayScore} ${awayTeam} (${status})\n`;

          if (match.venue) {
            result += `  📍 ${match.venue}\n`;
          }
        });

        result += '\n';
      });

      return result.trim();
    } catch (error) {
      console.error('Error fetching match summary:', error);
      throw new Error(`Failed to fetch match results: ${error.message}`);
    }
  }
}
