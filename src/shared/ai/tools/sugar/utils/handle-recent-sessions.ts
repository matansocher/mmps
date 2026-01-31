import { calculateSessionMetrics, getRecentSessions } from '@shared/sugar';
import { formatSessionSummary } from './format-utils';

type RecentSessionsParams = {
  readonly chatId: number;
};

export async function handleRecentSessions({ chatId }: RecentSessionsParams): Promise<string> {
  const sessions = await getRecentSessions(chatId, 10);
  if (sessions.length === 0) {
    return JSON.stringify({ success: true, message: 'No completed sessions yet', count: 0 });
  }

  const summaries = sessions.map((s) => formatSessionSummary(s, calculateSessionMetrics(s)));

  return JSON.stringify({
    success: true,
    count: sessions.length,
    sessions: summaries,
  });
}
