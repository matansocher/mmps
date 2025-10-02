import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { COMPETITION_IDS_MAP, getCompetitions, getCompetitionTable, getMatchesSummaryDetails } from '@services/scores-365';

const PRIORITY_LEAGUES = [COMPETITION_IDS_MAP.CHAMPIONS_LEAGUE, COMPETITION_IDS_MAP.PREMIER_LEAGUE, COMPETITION_IDS_MAP.LA_LIGA, COMPETITION_IDS_MAP.LIGAT_HAAL];

// League importance weights (higher = more important)
const LEAGUE_IMPORTANCE: Record<number, number> = {
  [COMPETITION_IDS_MAP.CHAMPIONS_LEAGUE]: 10,
  [COMPETITION_IDS_MAP.PREMIER_LEAGUE]: 8,
  [COMPETITION_IDS_MAP.LA_LIGA]: 8,
  [COMPETITION_IDS_MAP.LIGAT_HAAL]: 8,
};

// Minimum importance score for a match to be considered "important"
const IMPORTANCE_THRESHOLD = 15;

const schema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format to get top matches for'),
  maxMatches: z.number().optional().default(5).describe('Maximum number of matches to return (default: 5, only returns truly important matches)'),
});

/**
 * Calculate importance score for a match based on multiple factors
 */
async function calculateMatchImportance(
  match: { homeTeam: string; awayTeam: string; competitionId: number },
  competitionTable: Array<{ name: string; value: number; midValue: number }> | null,
): Promise<number> {
  let score = 0;

  // 1. League importance (base score)
  score += LEAGUE_IMPORTANCE[match.competitionId] || 0;

  if (competitionTable && competitionTable.length > 0) {
    const homeTeamData = competitionTable.find((row) => row.name === match.homeTeam);
    const awayTeamData = competitionTable.find((row) => row.name === match.awayTeam);

    if (homeTeamData && awayTeamData) {
      const homePosition = competitionTable.indexOf(homeTeamData) + 1;
      const awayPosition = competitionTable.indexOf(awayTeamData) + 1;
      const totalTeams = competitionTable.length;

      // 2. Top teams playing (positions 1-6 are most important)
      if (homePosition <= 6) score += 8 - homePosition; // 7 points for 1st, 6 for 2nd, etc.
      if (awayPosition <= 6) score += 8 - awayPosition;

      // 3. Close matches in table (within 3 positions = title race / relegation battle)
      const positionDiff = Math.abs(homePosition - awayPosition);
      if (positionDiff <= 3) {
        score += 5; // Teams close in table = important
      }

      // 4. Derby/rivalry indicator (both teams in top 10)
      if (homePosition <= 10 && awayPosition <= 10) {
        score += 3;
      }

      // 5. Top vs Top clash (both in top 4)
      if (homePosition <= 4 && awayPosition <= 4) {
        score += 8; // Title-deciding matches
      }

      // 6. Points difference (close in points = more important)
      const pointsDiff = Math.abs(homeTeamData.value - awayTeamData.value);
      if (pointsDiff <= 3) {
        score += 4; // Very close in points
      } else if (pointsDiff <= 6) {
        score += 2; // Moderately close
      }
    }
  }

  return score;
}

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

    // Filter for priority leagues only
    const priorityMatches = summaryDetails.filter((detail) => PRIORITY_LEAGUES.includes(detail.competition.id));

    // Get league tables for importance calculation
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

    // Build matches with importance scores
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
        // Only upcoming matches
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

    // Filter by importance threshold
    const importantMatches = matchesWithScores.filter((match) => match.importanceScore >= IMPORTANCE_THRESHOLD);

    // Sort by importance score (highest first)
    const sorted = importantMatches.sort((a, b) => {
      if (b.importanceScore !== a.importanceScore) {
        return b.importanceScore - a.importanceScore;
      }
      // If same score, sort by time (earlier first)
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    // Return only truly important matches (up to maxMatches)
    const topMatches = sorted.slice(0, maxMatches);

    if (!topMatches.length) {
      return `No important matches found for ${date}. (Checked priority leagues but none meet importance criteria)`;
    }

    // Remove importanceScore from output (internal use only)
    const matchesForOutput = topMatches.map(({ importanceScore, ...match }) => match);

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
