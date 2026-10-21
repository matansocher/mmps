import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getLongestStreak, getStreak, getStreakOfCorrectAnswers } from '@core/utils';
import { GameLog, type WorldlyLanguage } from '@shared/worldly';
import { worldlyText } from '../language';

export function generateStatisticsMessage(userGameLogs: GameLog[], language: WorldlyLanguage = 'en'): string {
  const text = worldlyText(language);
  const currentStreak = getStreak(userGameLogs.map((game) => game.createdAt));
  const longestStreak = getLongestStreak(userGameLogs.map((game) => game.createdAt));
  const todayKey = formatInTimeZone(new Date(), DEFAULT_TIMEZONE, 'yyyy-MM-dd');
  const todayGameLogs = userGameLogs.filter(({ createdAt }) => formatInTimeZone(createdAt, DEFAULT_TIMEZONE, 'yyyy-MM-dd') === todayKey);
  const todayCorrectGames = todayGameLogs.filter((log) => log.selected === log.correct);
  const { currentStreak: currentCorrectAnsweredStreak, longestStreak: longestCorrectAnsweredStreak } = getStreakOfCorrectAnswers(userGameLogs);

  return [
    [
      `💣`,
      text.today,
      `${todayCorrectGames.length}/${todayGameLogs.length}`,
      todayCorrectGames.length ? `-` : '',
      todayCorrectGames.length ? `${((todayCorrectGames.length / todayGameLogs.length) * 100).toFixed(2)}%` : '',
    ].join(' '),
    [`🤓`, text.currentCorrectStreak, `${currentCorrectAnsweredStreak}`].join(' '),
    [`🚀`, text.longestCorrectStreak, `${longestCorrectAnsweredStreak}`].join(' '),
    [`💯`, text.currentDayStreak, `${currentStreak}`].join(' '),
    [`🚀`, text.longestDayStreak, `${longestStreak}`].join(' '),
  ].join('\n');
}
