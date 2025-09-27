import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { DAYS_OF_WEEK, MY_USER_ID } from '@core/config';
import { getLongestStreak, getStars, getStreak } from '@core/utils';
import { createImage } from '@services/openai';
import { searchMeme } from '@services/tenor';
import { getExercises } from '@shared/trainer/mongo';
import { BROKEN_RECORD_IMAGE_PROMPT } from '../../../trainer/trainer.config';
import { getLastWeekDates } from '../../../trainer/utils';

const analyticsSchema = z.object({
  action: z.enum(['weekly_summary', 'achievements', 'generate_reminder', 'check_record']).describe('The action to perform'),
});

export const exerciseAnalyticsTool = new DynamicStructuredTool({
  name: 'exercise_analytics',
  description: 'Generate exercise analytics, summaries, achievements, and motivational content',
  schema: analyticsSchema,
  func: async ({ action }) => {
    try {
      const chatId = MY_USER_ID;

      switch (action) {
        case 'weekly_summary': {
          const exercises = await getExercises(chatId);
          const exercisesDates = exercises.map((exercise) => exercise.createdAt);

          const { lastSunday, lastSaturday } = getLastWeekDates();
          const lastWeekExercises = exercisesDates.filter((exerciseDate) => {
            return exerciseDate.getTime() > lastSunday.getTime() && exerciseDate.getTime() < lastSaturday.getTime();
          });

          const currentStreak = getStreak(lastWeekExercises);
          const longestStreak = getLongestStreak(exercisesDates);

          const exercisesDays = lastWeekExercises.map((exerciseDate) => DAYS_OF_WEEK[exerciseDate.getDay()]);
          const weekStars = getStars(lastWeekExercises.length);

          return JSON.stringify({
            weekSummary: {
              exerciseCount: lastWeekExercises.length,
              exerciseDays: exercisesDays,
              weekRating: weekStars,
              currentStreak,
              longestStreak,
              dateRange: {
                from: lastSunday.toISOString().split('T')[0],
                to: lastSaturday.toISOString().split('T')[0],
              },
            },
            message: 'Weekly summary generated successfully',
          });
        }

        case 'achievements': {
          const exercises = await getExercises(chatId);

          if (!exercises?.length) {
            return JSON.stringify({
              hasExercises: false,
              message: 'No exercises recorded yet. Time to get started!',
            });
          }

          const exercisesDates = exercises.map((exercise) => exercise.createdAt);
          const currentStreak = getStreak(exercisesDates);
          const longestStreak = getLongestStreak(exercisesDates);

          const { lastSunday, lastSaturday } = getLastWeekDates();
          const lastWeekExercises = exercisesDates.filter((exerciseDate) => {
            return exerciseDate.getTime() > lastSunday.getTime() && exerciseDate.getTime() < lastSaturday.getTime();
          });

          const exercisesDays = lastWeekExercises.map((exerciseDate) => DAYS_OF_WEEK[exerciseDate.getDay()]);
          const weekStars = getStars(lastWeekExercises.length);

          return JSON.stringify({
            hasExercises: true,
            achievements: {
              totalExercises: exercises.length,
              currentStreak,
              longestStreak,
              thisWeek: {
                count: lastWeekExercises.length,
                days: exercisesDays,
                rating: weekStars,
              },
              firstExercise: exercises[exercises.length - 1].createdAt,
              lastExercise: exercises[0].createdAt,
            },
            message: 'Achievements retrieved successfully',
          });
        }

        case 'generate_reminder': {
          const memeUrl = await searchMeme('funny lazy workout');

          return JSON.stringify({
            reminderType: 'motivational',
            memeUrl: memeUrl || null,
            defaultEmojis: '🦔🦔🦔🦔',
            message: memeUrl ? 'Motivational meme found' : 'Using default emoji reminder',
          });
        }

        case 'check_record': {
          const exercises = await getExercises(chatId);
          const exercisesDates = exercises.map((exercise) => exercise.createdAt);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const currentStreak = getStreak([...exercisesDates, today]);
          const previousLongestStreak = getLongestStreak(exercisesDates.slice(1)); // Exclude today's exercise

          const brokeRecord = currentStreak > 1 && currentStreak > previousLongestStreak;

          if (brokeRecord) {
            const prompt = BROKEN_RECORD_IMAGE_PROMPT.replace('{streak}', `${currentStreak}`);
            const imageUrl = await createImage(prompt);

            return JSON.stringify({
              brokeRecord: true,
              newRecord: currentStreak,
              previousRecord: previousLongestStreak,
              celebrationImageUrl: imageUrl,
              message: `New record! ${currentStreak} days in a row!`,
            });
          }

          return JSON.stringify({
            brokeRecord: false,
            currentStreak,
            longestStreak: getLongestStreak(exercisesDates),
            message: 'No new record',
          });
        }

        default:
          return JSON.stringify({ error: 'Invalid action' });
      }
    } catch (err) {
      return JSON.stringify({ error: `Failed to generate analytics: ${err.message}` });
    }
  },
});
