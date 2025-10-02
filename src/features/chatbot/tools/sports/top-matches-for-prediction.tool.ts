import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCompetitions, getCompetitionTable, getMatchesSummaryDetails } from '@services/scores-365';
import { calculateMatchImportance, IMPORTANCE_THRESHOLD, LEAGUE_IMPORTANCE } from './utils';

const schema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format to get top matches for'),
  maxMatches: z.number().optional().default(5).describe('Maximum number of matches to return (default: 5, only returns truly important matches)'),
});

async function runner({ date, maxMatches = 5 }: z.infer<typeof schema>) {
  try {
    const competitions = await getCompetitions();
    if (!competitions?.length) {
      return 'No competitions available at the moment.';
    }

    const summaryDetails = await getMatchesSummaryDetails(competitions, date);
    if (!summaryDetails?.length) {
      return `No matches found for ${date}.`;
    }

    const priorityLeagues = Object.keys(LEAGUE_IMPORTANCE).map(Number);
    const priorityMatches = summaryDetails.filter((detail) => priorityLeagues.includes(detail.competition.id));

    const leagueTables = new Map<number, Array<{ name: string; value: number; midValue: number }>>();
    for (const competitionDetail of priorityMatches) {
      if (competitionDetail.competition.hasTable) {
        const tableData = await getCompetitionTable(competitionDetail.competition.id);
        if (tableData?.competitionTable) {
          const formattedTable = tableData.competitionTable.map(({ competitor, points, gamesPlayed }) => ({
            name: competitor.name,
            value: points,
            midValue: gamesPlayed,
          }));
          leagueTables.set(competitionDetail.competition.id, formattedTable);
        }
      }
    }

    const matchesWithScores: Array<{
      matchId: number;
      competition: string;
      competitionId: number;
      homeTeam: string;
      awayTeam: string;
      startTime: string;
      status: string;
      venue: string;
      importanceScore: number;
    }> = [];

    for (const competitionDetail of priorityMatches) {
      const table = leagueTables.get(competitionDetail.competition.id) || null;

      for (const match of competitionDetail.matches) {
        const matchTime = new Date(match.startTime);
        const now = new Date();
        if (matchTime <= now || match.statusText !== 'טרם החל') {
          continue;
        }

        const importanceScore = await calculateMatchImportance(
          {
            homeTeam: match.homeCompetitor.name,
            awayTeam: match.awayCompetitor.name,
            competitionId: competitionDetail.competition.id,
          },
          table,
        );

        matchesWithScores.push({
          matchId: match.id,
          competition: competitionDetail.competition.name,
          competitionId: competitionDetail.competition.id,
          homeTeam: match.homeCompetitor.name,
          awayTeam: match.awayCompetitor.name,
          startTime: match.startTime,
          status: match.statusText,
          venue: match.venue,
          importanceScore,
        });
      }
    }

    const importantMatches = matchesWithScores.filter((match) => match.importanceScore >= IMPORTANCE_THRESHOLD);

    const sorted = importantMatches.sort((a, b) => {
      if (b.importanceScore !== a.importanceScore) {
        return b.importanceScore - a.importanceScore;
      }
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    const topMatches = sorted.slice(0, maxMatches);

    if (!topMatches.length) {
      return `No important matches found for ${date}. (Checked priority leagues but none meet importance criteria)`;
    }

    const matchesForOutput = topMatches.map(({ ...match }) => match);

    return JSON.stringify(
      {
        date,
        matchCount: matchesForOutput.length,
        note: `Found ${matchesForOutput.length} truly important matches (scored above importance threshold)`,
        matches: matchesForOutput,
      },
      null,
      2,
    );
  } catch (error) {
    return `Error fetching top matches: ${error.message}`;
  }
}

export const topMatchesForPredictionTool = tool(runner, {
  name: 'top_matches_for_prediction',
  description: `Get truly important upcoming matches for a given date that are worth predicting.

This tool uses SMART MATCH SELECTION based on multiple factors:
- League importance (Champions League, Premier League, La Liga, Israeli League)
- Team positions in league table (top teams = more important)
- Close matches (teams near each other in standings)
- Title races (top 4 teams playing each other)
- Points difference (close in points = more important)

IMPORTANT: This tool returns ONLY genuinely important matches. It might return 0, 1, 2, or more matches depending on what's actually important that day. Not every day has 3 important matches!

Returns only upcoming matches that haven't started yet, sorted by importance score (highest first).
Each match includes the matchId which you can use with the match_prediction_data tool to get detailed prediction data.`,
  schema,
});
