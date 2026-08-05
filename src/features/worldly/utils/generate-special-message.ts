import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getLongestStreak, getStreak, getStreakOfCorrectAnswers } from '@core/utils';
import { GameLog } from '@shared/worldly';

export function generateStatisticsMessage(userGameLogs: GameLog[]): string {
  const currentStreak = getStreak(userGameLogs.map((game) => game.createdAt));
  const longestStreak = getLongestStreak(userGameLogs.map((game) => game.createdAt));
  const todayKey = formatInTimeZone(new Date(), DEFAULT_TIMEZONE, 'yyyy-MM-dd');
  const todayGameLogs = userGameLogs.filter(({ createdAt }) => formatInTimeZone(createdAt, DEFAULT_TIMEZONE, 'yyyy-MM-dd') === todayKey);
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
