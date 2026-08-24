import { format } from 'date-fns';
import type { Bot } from 'grammy';
import { DAYS_OF_WEEK, MY_USER_ID } from '@core/config';
import { getErrorMessage, getStars, Logger } from '@core/utils';
import { sendRichMessage } from '@services/telegram';
import { getWeeklyExerciseStats, type WeeklyExerciseStats } from '@shared/trainer';

const logger = new Logger('chatbot:scheduler:weekly-exercise-summary');

function buildDaysTable({ exercisedWeekdays }: WeeklyExerciseStats): string {
  const header = `| ${DAYS_OF_WEEK.map((day) => day.slice(0, 3)).join(' | ')} |`;
  const divider = `|${DAYS_OF_WEEK.map(() => ':---:').join('|')}|`;
  const marks = `| ${DAYS_OF_WEEK.map((_, index) => (exercisedWeekdays.includes(index) ? '✅' : '—')).join(' | ')} |`;
  return [header, divider, marks].join('\n');
}

function buildStatsTable({ exerciseCount, currentStreak, longestStreak }: WeeklyExerciseStats): string {
  return [
    '| Metric | Value |',
    '|:-------|------:|',
    `| Workouts | ${exerciseCount} |`,
    `| Rating | ${getStars(exerciseCount)} |`,
    `| Current streak | ${currentStreak} |`,
    `| Longest streak | ${longestStreak} |`,
  ].join('\n');
}

export async function weeklyExerciseSummary(bot: Bot): Promise<void> {
  try {
    const stats = await getWeeklyExerciseStats(MY_USER_ID);
    const range = `${format(stats.weekStart, 'dd/MM')} - ${format(stats.weekEnd, 'dd/MM')}`;

    const message = [`*🏋️ Weekly exercise summary* (${range})`, buildDaysTable(stats), buildStatsTable(stats)].join('\n\n');

    await sendRichMessage(bot, MY_USER_ID, message);
  } catch (err) {
    logger.error(`Failed to send weekly exercise summary: ${getErrorMessage(err)}`);
  }
}
