import { endOfWeek, startOfWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getLongestStreak, getStreak } from '@core/utils';
import { getExercises } from '../mongo';

export type WeeklyExerciseStats = {
  readonly weekStart: Date;
  readonly weekEnd: Date;
  readonly exerciseCount: number;
  readonly exercisedWeekdays: ReadonlyArray<number>; // 0 = Sunday
  readonly currentStreak: number;
  readonly longestStreak: number;
};

export async function getWeeklyExerciseStats(chatId: number): Promise<WeeklyExerciseStats> {
  const exercises = await getExercises(chatId);
  const exerciseDates = exercises.map(({ createdAt }) => createdAt);

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(new Date());
  const weekDates = exerciseDates.filter((date) => date.getTime() >= weekStart.getTime() && date.getTime() <= weekEnd.getTime());
  const exercisedWeekdays = [...new Set(weekDates.map((date) => toZonedTime(date, DEFAULT_TIMEZONE).getDay()))].sort((a, b) => a - b);

  return {
    weekStart,
    weekEnd,
    exerciseCount: weekDates.length,
    exercisedWeekdays,
    currentStreak: getStreak(weekDates),
    longestStreak: getLongestStreak(exerciseDates),
  };
}
