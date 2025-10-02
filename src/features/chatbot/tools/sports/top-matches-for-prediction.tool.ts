import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { COMPETITION_IDS_MAP, getCompetitions, getMatchesSummaryDetails } from '@services/scores-365';

const PRIORITY_LEAGUES = [COMPETITION_IDS_MAP.CHAMPIONS_LEAGUE, COMPETITION_IDS_MAP.PREMIER_LEAGUE, COMPETITION_IDS_MAP.LA_LIGA, COMPETITION_IDS_MAP.LIGAT_HAAL];

const schema = z.object({
  date: z.string().describe('Date in YYYY-MM-DD format to get top matches for'),
  limit: z.number().optional().default(3).describe('Maximum number of matches to return (default: 3)'),
});

async function runner({ date, limit = 3 }: z.infer<typeof schema>) {
  try {
    const competitions = await getCompetitions();
    if (!competitions?.length) {
      return 'No competitions available at the moment.';
    }

    const summaryDetails = await getMatchesSummaryDetails(competitions, date);
    if (!summaryDetails?.length) {
      return `No matches found for ${date}.`;
    }

    const priorityMatches = summaryDetails.filter((detail) => PRIORITY_LEAGUES.includes(detail.competition.id));

    const allMatches: Array<{
      matchId: number;
      competition: string;
      competitionId: number;
      homeTeam: string;
      awayTeam: string;
      startTime: string;
      status: string;
      venue: string;
    }> = [];

    for (const competitionDetail of priorityMatches) {
      for (const match of competitionDetail.matches) {
        allMatches.push({
          matchId: match.id,
          competition: competitionDetail.competition.name,
          competitionId: competitionDetail.competition.id,
          homeTeam: match.homeCompetitor.name,
          awayTeam: match.awayCompetitor.name,
          startTime: match.startTime,
          status: match.statusText,
          venue: match.venue,
        });
      }
    }

    const upcomingMatches = allMatches.filter((match) => {
      const matchTime = new Date(match.startTime);
      const now = new Date();
      return matchTime > now && match.status === 'טרם החל';
    });

    const sorted = upcomingMatches.sort((a, b) => {
      const aPriority = PRIORITY_LEAGUES.indexOf(a.competitionId);
      const bPriority = PRIORITY_LEAGUES.indexOf(b.competitionId);
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    const topMatches = sorted.slice(0, limit);

    if (!topMatches.length) {
      return `No upcoming matches found for ${date} in priority leagues (Champions League, Premier League, La Liga, Israeli League).`;
    }

    return JSON.stringify(
      {
        date,
        matchCount: topMatches.length,
        matches: topMatches,
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
  description: `Get the top most important upcoming matches for a given date that would be interesting to predict.

This tool returns matches from priority leagues:
- Champions League (🏆)
- Premier League (🏴󠁧󠁢󠁥󠁮󠁧󠁿)
- La Liga (🇪🇸)
- Israeli League (🇮🇱)

Returns only upcoming matches that haven't started yet, sorted by league priority and match time.
Each match includes the matchId which you can use with the match_prediction_data tool to get detailed prediction data.`,
  schema,
});
