import { getStreakOfCorrectAnswers } from '@core/utils';
import { GameLog, getGameLogsByUsers, getTopByChatId, getUserDetails } from '@shared/worldly';

type LightUser = {
  readonly chatId: number;
  readonly correctCount: number;
  readonly records: GameLog[];
  readonly user: string;
};

async function getUser(existingUsers: { chatId: number; user: string }[], chatId: number): Promise<{ chatId: number; user: string } | null> {
  if (!chatId) return null;

  const cached = existingUsers.find((u) => u.chatId === chatId);
  if (cached) return { chatId, user: cached.user };

  const user = await getUserDetails(chatId);
  const userName = [user?.firstName, user?.lastName, user?.username].filter(Boolean).join(' ') || 'Unknown User';
  return { chatId, user: userName };
}

function getMaxStreak<T extends { [key: string]: any }>(records: T[], key: string): T {
  return records.reduce((max, curr) => (curr[key] > max[key] ? curr : max), { [key]: 0 } as T);
}

export async function getWorldlySummary(): Promise<string> {
  const topChatIds = await getTopByChatId(10);

  const topUsers: LightUser[] = await Promise.all(
    topChatIds.map(async ({ chatId, records }) => {
      const { user } = await getUser([], chatId);
      const correctCount = records.filter((r) => r.selected === r.correct).length;
      return { chatId, user, correctCount, records };
    }),
  );

  const gameLogsByUsers = await getGameLogsByUsers();
  const today = new Date();
  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

  const streaks = Object.entries(gameLogsByUsers).map(([chatId, logs]) => {
    const fullStreak = getStreakOfCorrectAnswers(logs).longestStreak;
    const weekLogs = logs.filter((log) => new Date(log.createdAt) >= startOfWeek);
    const weeklyStreak = getStreakOfCorrectAnswers(weekLogs).longestStreak;
    return { chatId: Number(chatId), fullStreak, weeklyStreak };
  });

  const longestOverall = getMaxStreak(streaks, 'fullStreak');
  const longestThisWeek = getMaxStreak(streaks, 'weeklyStreak');

  const greatestStreakUser = await getUser(topUsers, longestOverall?.chatId);
  const greatestWeekUser = await getUser(topUsers, longestThisWeek?.chatId);

  const summaryLines = topUsers.map(({ user, correctCount, records }, i) => {
    const percentage = ((correctCount / records.length) * 100).toFixed(2);
    return `${i + 1}. ${user}: ${correctCount}/${records.length} - ${percentage}%`;
  });

  return `🏆 Greatest Streak Ever: ${greatestStreakUser ? `${greatestStreakUser.user} (${longestOverall.fullStreak})` : 'No record'}
📅 Greatest Streak This Week: ${greatestWeekUser ? `${greatestWeekUser.user} (${longestThisWeek.weeklyStreak})` : 'No record'}

🔥 Top Users This Week:
${summaryLines.join('\n')}`;
}
