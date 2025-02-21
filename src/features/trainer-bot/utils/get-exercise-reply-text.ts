import { EXERCISE_REPLY_MESSAGES, SPECIAL_STREAKS_MESSAGES } from './messages';
import { processMessageTemplate } from './process-message-template';

export function getExerciseReplyText({ currentStreak, longestStreak }): string {
  const specialSteaks = Object.keys(SPECIAL_STREAKS_MESSAGES);
  currentStreak = 7;
  if (specialSteaks.includes(`${currentStreak}`)) {
    const relevantMessages = SPECIAL_STREAKS_MESSAGES[currentStreak];
    const specialStreakTemplate = relevantMessages[Math.floor(Math.random() * relevantMessages.length)];
    return processMessageTemplate(specialStreakTemplate, { currentStreak });
  }
  const exerciseTemplate = EXERCISE_REPLY_MESSAGES[Math.floor(Math.random() * EXERCISE_REPLY_MESSAGES.length)];
  return processMessageTemplate(exerciseTemplate, { currentStreak, longestStreak });
}
