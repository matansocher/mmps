import { v4 as uuidv4 } from 'uuid';
import { DifficultyLevel, getCurrentGame, Player, saveGameLog, updateGameLog } from '@shared/striker';
import { formatHintMessage, getPlayerName } from './format-messages';
import { getRandomPlayer } from './get-random-player';

const DIFFICULTY_RATING_MAP = {
  [DifficultyLevel.EASY]: undefined,
  [DifficultyLevel.MEDIUM]: 83,
  [DifficultyLevel.HARD]: 85,
};

export async function startNewGame(chatId: number, difficulty?: DifficultyLevel): Promise<{ message: string; player: Player }> {
  const currentGame = await getCurrentGame(chatId);

  // If there's an active game, end it as incomplete
  if (currentGame) {
    await updateGameLog({
      chatId,
      gameId: currentGame.gameId,
      guess: '[abandoned]',
      hintsRevealed: currentGame.hintsRevealed,
      isCorrect: false,
      score: 0,
    });
  }

  const minRating = difficulty ? DIFFICULTY_RATING_MAP[difficulty] : undefined;
  const player = getRandomPlayer(minRating);
  const gameId = uuidv4();

  await saveGameLog({ chatId, gameId, playerId: player.id, playerName: getPlayerName(player), hintsRevealed: 1 });

  return { message: formatHintMessage(player, 1), player };
}
