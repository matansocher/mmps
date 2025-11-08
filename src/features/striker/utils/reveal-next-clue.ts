import { getCurrentGame, Player, updateGameLog } from '@shared/striker';
import { PLAYERS_DATA } from '../data/players-data';
import { CLUE_REVEALED_MESSAGE, formatHintMessage, NO_ACTIVE_GAME_MESSAGE, NO_MORE_CLUES_MESSAGE } from './format-messages';

export async function revealNextClue(chatId: number): Promise<{ message: string; player?: Player; hintsRevealed?: number }> {
  const currentGame = await getCurrentGame(chatId);
  if (!currentGame) {
    return { message: NO_ACTIVE_GAME_MESSAGE };
  }

  if (currentGame.hintsRevealed >= 6) {
    return { message: NO_MORE_CLUES_MESSAGE };
  }

  const player = PLAYERS_DATA.find((p) => p.id === currentGame.playerId);
  if (!player) {
    return { message: 'Error: Player data not found. Please start a new game.' };
  }

  const newHintsRevealed = currentGame.hintsRevealed + 1;

  await updateGameLog({ chatId, gameId: currentGame.gameId, guess: '', hintsRevealed: newHintsRevealed, isCorrect: false, score: 0 });

  const hintMessage = formatHintMessage(player, newHintsRevealed);

  return { message: `${CLUE_REVEALED_MESSAGE}\n\n${hintMessage}`, player, hintsRevealed: newHintsRevealed };
}
