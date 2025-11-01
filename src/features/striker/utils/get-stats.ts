import { getUserStats } from '@shared/striker/mongo/user';
import { formatStatsMessage, NO_STATS_MESSAGE } from '.';

export async function getStats(chatId: number): Promise<string> {
  const stats = await getUserStats(chatId);

  if (!stats || stats.totalGames === 0) {
    return NO_STATS_MESSAGE;
  }

  return formatStatsMessage(stats);
}
