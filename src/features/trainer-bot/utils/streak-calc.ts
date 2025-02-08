import { isSameDay } from 'date-fns';

export function getStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  const lastExerciseDate = sortedDates[dates.length - 1];
  if (isSameDay(lastExerciseDate, new Date())) {
    return calculateStreak(sortedDates).currentStreak;
  }

  return calculateStreak(sortedDates).currentStreak;
}

export function getLongestStreak(dates: Date[]): number {
  return calculateStreak(dates).longestStreak;
}

function calculateStreak(dates: Date[]): { currentStreak: number; longestStreak: number } {
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Sort dates in ascending order
  dates.sort((a, b) => a.getTime() - b.getTime());

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 1; // Start with 1 since we have at least one exercise
  let previousDate = new Date(dates[0]);
  previousDate.setHours(0, 0, 0, 0); // Normalize to start of the day

  for (let i = 1; i < dates.length; i++) {
    const exerciseDate = new Date(dates[i]);
    exerciseDate.setHours(0, 0, 0, 0); // Normalize to start of the day

    const diffDays = Math.round((exerciseDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Continues the streak
      streak++;
    } else if (diffDays > 1) {
      // Streak is broken
      longestStreak = Math.max(longestStreak, streak);
      streak = 1; // Reset streak
    }

    previousDate = exerciseDate;
  }

  longestStreak = Math.max(longestStreak, streak); // Final comparison

  // Determine if the current streak is still active
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastExercise = new Date(dates[dates.length - 1]);
  lastExercise.setHours(0, 0, 0, 0);

  const lastExerciseDiff = Math.round((today.getTime() - lastExercise.getTime()) / (1000 * 60 * 60 * 24));

  currentStreak = lastExerciseDiff <= 1 ? streak : 0; // If last exercise was today or yesterday, keep streak, else reset

  return { currentStreak, longestStreak };
}
