import { v4 as uuidv4 } from 'uuid';
import { DifficultyLevel, getCurrentGame, Player, updateGameLog } from '@shared/striker';
import { formatHintMessage, getPlayerName } from './format-messages';
import { getRandomPlayer } from './get-random-player';

const DIFFICULTY_RATING_MAP = {
  [DifficultyLevel.EASY]: 85,
  [DifficultyLevel.MEDIUM]: 83,
  [DifficultyLevel.HARD]: undefined,
};

export async function startNewGame(chatId: number, difficulty?: DifficultyLevel): Promise<{ message: string; player: Player; gameId: string; playerId: number; playerName: string }> {
  const currentGame = await getCurrentGame(chatId);

  // If there's an active game, end it as incomplete with answeredAt set
  if (currentGame) {
    await updateGameLog({
      chatId,
      gameId: currentGame.gameId,
      guess: '[gave up]',
      hintsRevealed: currentGame.hintsRevealed,
      isCorrect: false,
      score: 0,
    });
  }

  const minRating = difficulty ? DIFFICULTY_RATING_MAP[difficulty] : undefined;
  const player = getRandomPlayer(minRating);
  const gameId = uuidv4();
  const playerName = getPlayerName(player);

  return { message: formatHintMessage(player, 1), player, gameId, playerId: player.id, playerName };
}
