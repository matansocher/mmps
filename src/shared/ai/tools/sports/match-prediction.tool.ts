import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getMatchDetails, getMatchTrends, getPregameData } from '@services/scores-365';

const schema = z.object({
  matchId: z.number().describe('The ID of the match to predict'),
});

async function runner({ matchId }: z.infer<typeof schema>) {
  try {
    const matchDetails = await getMatchDetails(matchId);
    if (!matchDetails) {
      return `Match with ID ${matchId} not found.`;
    }

    const [matchTrends, pregameData] = await Promise.all([getMatchTrends(matchId), getPregameData(matchId)]);

    const predictionData = {
      match: {
        id: matchDetails.id,
        homeTeam: matchDetails.homeCompetitor.name,
        awayTeam: matchDetails.awayCompetitor.name,
        venue: matchDetails.venue,
        startTime: matchDetails.startTime,
        status: matchDetails.statusText,
      },
      trends: matchTrends?.trends || null,
      pregameStats: pregameData?.statistics || null,
    };

    return JSON.stringify(predictionData, null, 2);
  } catch (error) {
    return `Error fetching match prediction data: ${error.message}`;
  }
}

export const matchPredictionTool = tool(runner, {
  name: 'match_prediction_data',
  description: `Get comprehensive data for predicting a football match outcome. Returns match details, trends (recent form, goals statistics), and pre-game data (betting odds, key stats, last meetings).

Use this tool to gather all the data needed to make an informed prediction about a match outcome. The data includes:
- Match basic info (teams, venue, time)
- Match trends (recent form like WWDLW, goals scored/conceded)
- Pre-game statistics (betting odds, average goals, win streaks, head-to-head meetings)

After getting this data, analyze it comprehensively considering:
- Home advantage (playing at home venue)
- Recent form and momentum (W/D/L patterns)
- Goals statistics (attacking/defensive strength)
- Betting odds (they reflect market expectations and are very valuable)
- Historical meetings between the teams
- Any other contextual factors

Provide probabilities for Home Win, Draw, and Away Win (must sum to 100%) and explain your reasoning in detail.`,
  schema,
});
