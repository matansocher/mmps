import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCompetitions, getCompetitionTable, getMatchesSummaryDetails } from '@services/scores-365';

const schema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format to get all matches for'),
});

async function runner({ date }: z.infer<typeof schema>) {
  try {
    const competitions = await getCompetitions();
    if (!competitions?.length) {
      return 'No competitions available at the moment.';
    }

    const summaryDetails = await getMatchesSummaryDetails(competitions, date);
    if (!summaryDetails?.length) {
      return `No matches found for ${date}.`;
    }

    const leagueTables = new Map<number, Array<{ name: string; position: number; points: number; gamesPlayed: number }>>();

    // Fetch league tables for competitions that have them
    for (const competitionDetail of summaryDetails) {
      if (competitionDetail.competition.hasTable) {
        const tableData = await getCompetitionTable(competitionDetail.competition.id);
        if (tableData?.competitionTable) {
          const formattedTable = tableData.competitionTable.map(({ competitor, points, gamesPlayed }, index) => ({
            name: competitor.name,
            position: index + 1,
            points,
            gamesPlayed,
          }));
          leagueTables.set(competitionDetail.competition.id, formattedTable);
        }
      }
    }

    const allMatches: Array<{
      matchId: number;
      competition: string;
      competitionId: number;
      homeTeam: string;
      awayTeam: string;
      startTime: string;
      status: string;
      venue: string;
      homeTeamPosition?: number;
      awayTeamPosition?: number;
      homeTeamPoints?: number;
      awayTeamPoints?: number;
    }> = [];

    for (const competitionDetail of summaryDetails) {
      const table = leagueTables.get(competitionDetail.competition.id);

      for (const match of competitionDetail.matches) {
        const matchTime = new Date(match.startTime);
        const now = new Date();
        // Only include upcoming matches that haven't started
        if (matchTime <= now || match.statusText !== 'טרם החל') {
          continue;
        }

        const matchData: any = {
          matchId: match.id,
          competition: competitionDetail.competition.name,
          competitionId: competitionDetail.competition.id,
          homeTeam: match.homeCompetitor.name,
          awayTeam: match.awayCompetitor.name,
          startTime: match.startTime,
          status: match.statusText,
          venue: match.venue,
        };

        // Add league table data if available
        if (table) {
          const homeTeamData = table.find((row) => row.name === match.homeCompetitor.name);
          const awayTeamData = table.find((row) => row.name === match.awayCompetitor.name);

          if (homeTeamData) {
            matchData.homeTeamPosition = homeTeamData.position;
            matchData.homeTeamPoints = homeTeamData.points;
          }
          if (awayTeamData) {
            matchData.awayTeamPosition = awayTeamData.position;
            matchData.awayTeamPoints = awayTeamData.points;
          }
        }

        allMatches.push(matchData);
      }
    }

    if (!allMatches.length) {
      return `No upcoming matches found for ${date}.`;
    }

    // Sort by start time
    const sorted = allMatches.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return JSON.stringify(
      {
        date,
        matchCount: sorted.length,
        note: `All upcoming matches for ${date}. You should analyze these matches and decide which ones are important based on factors like: league prestige, team positions in standings, title races, relegation battles, derbies, and points differences.`,
        matches: sorted,
      },
      null,
      2,
    );
  } catch (error) {
    return `Error fetching matches: ${error.message}`;
  }
}

export const topMatchesForPredictionTool = tool(runner, {
  name: 'top_matches_for_prediction',
  description: `Get ALL upcoming matches for a given date with league table information where available.

This tool returns ALL upcoming matches (not started yet) for the specified date, including:
- Match details (teams, venue, start time)
- Competition information
- League table positions and points (when available)

You should analyze the matches and determine which ones are important based on factors such as:
- League prestige (Champions League, top European leagues, etc.)
- Team positions in standings (top teams, title races)
- Close matches in the table (teams near each other)
- Points differences (teams competing for same positions)
- Relegation battles
- Derby matches

Each match includes the matchId which you can use with the match_prediction_data tool to get detailed prediction data for the matches you deem important.`,
  schema,
});
