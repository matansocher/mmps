import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getMakavdiaResults } from '@services/scores-365';

const schema = z.object({});

async function runner() {
  const makavdiaResults = await getMakavdiaResults();

  if (!makavdiaResults) {
    return `לא נמצאו משחקים`;
  }

  const todayGame = makavdiaResults.games.find((game) => {
    const gameDate = new Date(game.game.startTime);
    const today = new Date();
    return gameDate.getDate() === today.getDate() && gameDate.getMonth() === today.getMonth() && gameDate.getFullYear() === today.getFullYear();
  });
  return todayGame ? JSON.stringify(todayGame, null, 2) : 'לא היה משחק היום';
}

export const makavdiaTool = tool(runner, {
  name: 'makavdia',
  description:
    'Get the latest 5 games and comprehensive statistics for NBA player Deni Avdija. Returns detailed data including game results, opponent teams, scores, venue information, game times, player performance stats, and more for each of the last 5 matches.',
  schema,
});
