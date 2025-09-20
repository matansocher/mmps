import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { getLongestStreak, getStreak } from '@core/utils';
import { addExercise, getExercises, getTodayExercise } from '@shared/domains/trainer/mongo';

export function getLastWeekDates(): { lastSunday: Date; lastSaturday: Date } {
  const now = new Date();
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  lastSunday.setHours(0, 0, 0, 0);

  const lastSaturday = new Date(lastSunday);
  lastSaturday.setDate(lastSunday.getDate() + 6);
  lastSaturday.setHours(23, 59, 59, 999);

  return { lastSunday, lastSaturday };
}

const exerciseSchema = z.object({
  action: z.enum(['log', 'check_today', 'get_history', 'get_streaks']).describe('The action to perform'),
  limit: z.number().optional().default(100).describe('Limit for history retrieval'),
});

export const exerciseTool = new DynamicStructuredTool({
  name: 'exercise_tracker',
  description: "Manage exercise tracking - log exercises, check today's status, get history, and calculate streaks",
  schema: exerciseSchema,
  func: async ({ action, limit }) => {
    try {
      const chatId = MY_USER_ID;

      switch (action) {
        case 'log': {
          await addExercise(chatId);

          const exercises = await getExercises(chatId);
          const exercisesDates = exercises.map((exercise) => exercise.createdAt);
          const currentStreak = getStreak(exercisesDates);
          const longestStreak = getLongestStreak(exercisesDates);

          const { lastSunday, lastSaturday } = getLastWeekDates();
          const thisWeekExercises = exercisesDates.filter((date) => {
            return date.getTime() > lastSunday.getTime() && date.getTime() < lastSaturday.getTime();
          });

          const brokeRecord = currentStreak > 1 && currentStreak > longestStreak;

          return JSON.stringify({
            success: true,
            message: 'Exercise logged successfully',
            stats: {
              currentStreak,
              longestStreak: brokeRecord ? currentStreak : longestStreak,
              thisWeekCount: thisWeekExercises.length,
              totalExercises: exercises.length,
              brokeRecord,
            },
          });
        }

        case 'check_today': {
          const todayExercise = await getTodayExercise(chatId);
          return JSON.stringify({
            exercisedToday: !!todayExercise,
            message: todayExercise ? 'Already exercised today' : 'No exercise logged today',
          });
        }

        case 'get_history': {
          const exercises = await getExercises(chatId, limit);
          const exercisesDates = exercises.map((exercise) => exercise.createdAt);

          const exercisesByDate = exercises.reduce(
            (acc, exercise) => {
              const dateKey = exercise.createdAt.toISOString().split('T')[0];
              if (!acc[dateKey]) {
                acc[dateKey] = [];
              }
              acc[dateKey].push(exercise.createdAt);
              return acc;
            },
            {} as Record<string, Date[]>,
          );

          return JSON.stringify({
            totalExercises: exercises.length,
            exercisesByDate: Object.keys(exercisesByDate).map((date) => ({
              date,
              count: exercisesByDate[date].length,
            })),
            latestExercises: exercisesDates.slice(0, 10).map((date) => date.toISOString()),
          });
        }

        case 'get_streaks': {
          const exercises = await getExercises(chatId);
          if (!exercises.length) {
            return JSON.stringify({
              currentStreak: 0,
              longestStreak: 0,
              message: 'No exercises recorded yet',
            });
          }

          const exercisesDates = exercises.map((exercise) => exercise.createdAt);
          const currentStreak = getStreak(exercisesDates);
          const longestStreak = getLongestStreak(exercisesDates);

          const { lastSunday, lastSaturday } = getLastWeekDates();
          const thisWeekExercises = exercisesDates.filter((date) => {
            return date.getTime() > lastSunday.getTime() && date.getTime() < lastSaturday.getTime();
          });

          const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const thisWeekDays = thisWeekExercises.map((date) => daysOfWeek[date.getDay()]);

          return JSON.stringify({
            currentStreak,
            longestStreak,
            totalExercises: exercises.length,
            thisWeek: {
              count: thisWeekExercises.length,
              days: thisWeekDays,
            },
          });
        }

        default:
          return JSON.stringify({ error: 'Invalid action' });
      }
    } catch (error) {
      return JSON.stringify({
        error: `Failed to perform exercise action: ${error.message}`,
      });
    }
  },
});
