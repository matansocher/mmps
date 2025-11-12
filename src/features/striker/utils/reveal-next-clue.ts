import { getCurrentGame, Player, updateGameLog } from '@shared/striker';
import { PLAYERS_DATA } from '../data/players-data';
import { formatHintMessage, NO_ACTIVE_GAME_MESSAGE, NO_MORE_CLUES_MESSAGE } from './format-messages';

export async function revealNextClue(chatId: number): Promise<{ success: boolean; message: string; messageId?: number; player?: Player; hintsRevealed?: number }> {
  const currentGame = await getCurrentGame(chatId);
  if (!currentGame) {
    return { success: false, message: NO_ACTIVE_GAME_MESSAGE };
  }

  if (currentGame.hintsRevealed >= 6) {
    return { success: false, message: NO_MORE_CLUES_MESSAGE };
  }

  if (!currentGame.messageId) {
    return { success: false, message: 'Cannot edit message. Please start a new game.' };
  }

  const player = PLAYERS_DATA.find((p) => p.id === currentGame.playerId);
  if (!player) {
    return { success: false, message: 'Error: Player data not found. Please start a new game.' };
  }

  const newHintsRevealed = currentGame.hintsRevealed + 1;

  await updateGameLog({ chatId, gameId: currentGame.gameId, guess: '', hintsRevealed: newHintsRevealed, isCorrect: false, score: 0 });

  const hintMessage = formatHintMessage(player, newHintsRevealed);

  return { success: true, message: hintMessage, messageId: currentGame.messageId, player, hintsRevealed: newHintsRevealed };
}
