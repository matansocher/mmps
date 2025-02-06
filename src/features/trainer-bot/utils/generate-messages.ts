import { EXERCISE_ENCOURAGE_MESSAGES, EXERCISE_REPLY_MESSAGES, SPECIAL_STREAKS_MESSAGES, WEEKLY_SUMMARY_MESSAGES } from './messages';

export function generateExerciseReplyMessage({ currentStreak, longestStreak }: { currentStreak: number; longestStreak: number }): string {
  const message = EXERCISE_REPLY_MESSAGES[Math.floor(Math.random() * EXERCISE_REPLY_MESSAGES.length)];
  return message.replaceAll('{currentStreak}', `${currentStreak}`).replaceAll('{longestStreak}', `${longestStreak}`);
}

export function generateExerciseEncourageMessage({ currentStreak }: { currentStreak: number }): string {
  const message = EXERCISE_ENCOURAGE_MESSAGES[Math.floor(Math.random() * EXERCISE_ENCOURAGE_MESSAGES.length)];
  return message.replaceAll('{currentStreak}', `${currentStreak}`);
}

export function generateSpecialStreakMessage(streak: number): string {
  const specialSteaks = Object.keys(SPECIAL_STREAKS_MESSAGES);
  if (!specialSteaks.includes(`${streak}`)) {
    return null;
  }
  const relevantMessages = SPECIAL_STREAKS_MESSAGES[streak];
  return relevantMessages[Math.floor(Math.random() * relevantMessages.length)];
}

export function generateWeeklySummaryMessage({ totalExercises, currentStreak, longestStreak }): string {
  const message = WEEKLY_SUMMARY_MESSAGES[Math.floor(Math.random() * WEEKLY_SUMMARY_MESSAGES.length)];
  return message
    .replaceAll('{totalExercises}', `${totalExercises}`)
    .replaceAll('{currentStreak}', `${currentStreak}`)
    .replaceAll('{longestStreak}', `${longestStreak}`);
}
