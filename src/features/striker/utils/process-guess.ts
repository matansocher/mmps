import { getCurrentGame, Player, updateGameLog, updateUserStats } from '@shared/striker';
import { PLAYERS_DATA } from '../data/players-data';
import { formatSuccessMessage, formatWrongGuessMessage, getPlayerName, NO_ACTIVE_GAME_MESSAGE } from './format-messages';
import { fuzzyMatchPlayerNameParts } from './fuzzy-match-player-name-parts';

type ProcessGuessResult = {
  readonly isCorrect: boolean;
  readonly message: string;
  readonly player?: Player;
  readonly score?: number;
};

export async function processGuess(chatId: number, guess: string): Promise<ProcessGuessResult> {
  const currentGame = await getCurrentGame(chatId);
  if (!currentGame) {
    return { isCorrect: false, message: NO_ACTIVE_GAME_MESSAGE };
  }

  const player = PLAYERS_DATA.find((p) => p.id === currentGame.playerId);
  if (!player) {
    return { isCorrect: false, message: 'Error: Player data not found. Please start a new game.' };
  }

  const isCorrect = fuzzyMatchPlayerNameParts(guess, getPlayerName(player));

  if (isCorrect) {
    const score = Math.max(1, 5 - (currentGame.hintsRevealed - 1));

    await updateGameLog({ chatId, gameId: currentGame.gameId, guess, hintsRevealed: currentGame.hintsRevealed, isCorrect: true, score });

    await updateUserStats(chatId, { isCorrect: true, hintsUsed: currentGame.hintsRevealed, score });

    const allGuesses = [...currentGame.guesses, guess];

    const message = formatSuccessMessage(player, score, currentGame.hintsRevealed, allGuesses);
    return { isCorrect: true, message, player, score };
  } else {
    await updateGameLog({ chatId, gameId: currentGame.gameId, guess, hintsRevealed: currentGame.hintsRevealed, isCorrect: false, score: 0 });

    return { isCorrect: false, message: formatWrongGuessMessage(guess, currentGame.hintsRevealed), player };
  }
}
