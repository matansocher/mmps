import { GameLog } from '@core/mongo/worldly-mongo';
import { getLongestStreak, getStreak, getStreakOfCorrectAnswers } from '@core/utils';

export function generateStatisticsMessage(userGameLogs: GameLog[]): string {
  const currentStreak = getStreak(userGameLogs.map((game) => game.createdAt));
  const longestStreak = getLongestStreak(userGameLogs.map((game) => game.createdAt));
  const todayGameLogs = userGameLogs.filter(
    ({ createdAt }) => createdAt.getDate() === new Date().getDate() && createdAt.getMonth() === new Date().getMonth() && createdAt.getFullYear() === new Date().getFullYear(),
  );
  const todayCorrectGames = todayGameLogs.filter((log) => log.selected === log.correct);
  const { currentStreak: currentCorrectAnsweredStreak, longestStreak: longestCorrectAnsweredStreak } = getStreakOfCorrectAnswers(userGameLogs);

  return [
    [
      `💣`,
      `היום:`,
      `${todayCorrectGames.length}/${todayGameLogs.length}`,
      todayCorrectGames.length ? `-` : '',
      todayCorrectGames.length ? `${((todayCorrectGames.length / todayGameLogs.length) * 100).toFixed(2)}%` : '',
    ].join(' '),
    [`🤓`, 'רצף התשובות הנכונות הנוכחי:', `${currentCorrectAnsweredStreak}`].join(' '),
    [`🚀`, 'רצף התשובות הנכונות הכי ארוך:', `${longestCorrectAnsweredStreak}`].join(' '),
    [`💯`, 'רצף הימים הנוכחי:', `${currentStreak}`].join(' '),
    [`🚀`, 'רצף הימים הכי ארוך:', `${longestStreak}`].join(' '),
  ].join('\n');
}
