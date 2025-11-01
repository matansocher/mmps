import { Player } from '@shared/striker';
import { getCurrentGame, updateGameLog } from '@shared/striker/mongo/game-log';
import { updateUserStats } from '@shared/striker/mongo/user';
import { formatGiveUpMessage, NO_ACTIVE_GAME_MESSAGE } from '.';
import { PLAYERS_DATA } from '../data/players-data';

export async function giveUp(chatId: number): Promise<{ message: string; player?: Player }> {
  const currentGame = await getCurrentGame(chatId);
  if (!currentGame) {
    return { message: NO_ACTIVE_GAME_MESSAGE };
  }

  const player = PLAYERS_DATA.find((p) => p.id === currentGame.playerId);
  if (!player) {
    return { message: 'Error: Player data not found.' };
  }

  await updateGameLog({ chatId, gameId: currentGame.gameId, guess: '[gave up]', hintsRevealed: currentGame.hintsRevealed, isCorrect: false, score: 0 });

  await updateUserStats(chatId, { isCorrect: false, hintsUsed: currentGame.hintsRevealed, score: 0 });

  return { message: formatGiveUpMessage(player), player };
}
