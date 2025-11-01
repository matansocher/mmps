import { v4 as uuidv4 } from 'uuid';
import { getCurrentGame, Player, saveGameLog } from '@shared/striker';
import { ALREADY_PLAYING_MESSAGE, formatHintMessage, getPlayerName } from './format-messages';
import { getRandomPlayer } from './get-random-player';

export async function startNewGame(chatId: number): Promise<{ message: string; player: Player }> {
  const currentGame = await getCurrentGame(chatId);
  if (currentGame) {
    return { message: ALREADY_PLAYING_MESSAGE, player: null };
  }

  const player = getRandomPlayer();
  const gameId = uuidv4();

  await saveGameLog({ chatId, gameId, playerId: player.id, playerName: getPlayerName(player), hintsRevealed: 1 });

  return { message: formatHintMessage(player, 1), player };
}
