import { competitionMatchesTool, competitionsListTool, competitionTableTool, matchPredictionTool, matchSummaryTool, topMatchesForPredictionTool } from '@shared/ai';
import { AgentDescriptor } from '../../types';
import { SPORTS_AGENT_NAME, SPORTS_AGENT_PROMPT } from './sports.config';

const SPORTS_AGENT_DESCRIPTION =
  'Football/sports analyst: match results and summaries, league tables, upcoming fixtures, competition info, and match outcome predictions with betting-odds-driven probabilities, expected-value value bets, and risk ratings.';

export function sportsAgent(): AgentDescriptor {
  return {
    name: SPORTS_AGENT_NAME,
    description: SPORTS_AGENT_DESCRIPTION,
    prompt: SPORTS_AGENT_PROMPT,
    tools: [competitionsListTool, competitionMatchesTool, competitionTableTool, matchSummaryTool, topMatchesForPredictionTool, matchPredictionTool],
  };
}
