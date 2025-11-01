import { getUserStats } from '@shared/striker';
import { formatStatsMessage, NO_STATS_MESSAGE } from './format-messages';

export async function getStats(chatId: number): Promise<string> {
  const stats = await getUserStats(chatId);

  if (!stats || stats.totalGames === 0) {
    return NO_STATS_MESSAGE;
  }

  return formatStatsMessage(stats);
}
