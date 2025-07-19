import { GameLog } from '@core/mongo/quizzy-mongo';
import { getDateString, getLongestStreak, getStreak, getStreakOfCorrectAnswers } from '@core/utils';

export const SPECIAL_STREAK_OF_DAYS_MIN = 4;
export const SPECIAL_CORRECT_ANSWERS_STREAKS = [4, 7, 10, 15, 20, 30];
export const SPECIAL_AMOUNT_OF_TOTAL_GAMES_PLAYED = [10, 50];

function getStreakOfCorrectMessages(userGameLogs: GameLog[]): string {
  let streak = 0;
  for (let i = 0; i < userGameLogs.length; i++) {
    if (userGameLogs[i].correct === userGameLogs[i].selected) {
      streak++;
    } else {
      break;
    }
  }
  if (!SPECIAL_CORRECT_ANSWERS_STREAKS.includes(streak)) {
    return null;
  }
  const messages = [
    ['Wow, someone here is crushing it! 🎉', `${streak} correct answers in a row! 🔥`, 'Keep it up! 💪'].join('\n'),
    ['What a champion! 👏', `You answered correctly ${streak} times in a row!`, `Keep going, you're on the right track! 🚀`].join('\n'),
    ['Wow! 🏅', `${streak} correct answers in a row!`, 'Champion! 🦸‍♂️'].join('\n'),
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getStreakOfDaysPlayed(userGameLogs: GameLog[]): string {
  const todayGames = userGameLogs.filter((log) => getDateString(new Date(log.createdAt)) === getDateString());
  if (todayGames?.length > 1) {
    return null;
  }
  const dates = userGameLogs.map((log) => new Date(log.createdAt));
  const streak = getStreak(dates);
  if (streak < SPECIAL_STREAK_OF_DAYS_MIN) {
    return null;
  }
  const messages = [
    ['Wow, I want to say congratulations on your persistence! 🎉', `Playing for ${streak} days every day is fire 🔥`, 'Keep it up! 💪'].join('\n'),
    ['What persistence! 👏', `You've been playing for ${streak} days in a row!`, 'Amazing! Keep coming every day! 🌟'].join('\n'),
    ['Regular player! 🏆', `Already ${streak} days in a row in the game!`, 'Congratulations on your persistence! 🔥'].join('\n'),
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getTotalGamesPlayedMessages(userGameLogs: GameLog[]): string {
  const indexOfSpecialStreak = SPECIAL_AMOUNT_OF_TOTAL_GAMES_PLAYED.indexOf(userGameLogs.length);
  const isHundredth = userGameLogs.length % 100 === 0;
  if (indexOfSpecialStreak === -1 && !isHundredth) {
    return null;
  }
  const messages = [
    ['Hooray hooray!! 🎉', 'You answered a special number of questions! 🔥', `${userGameLogs.length} questions!`, 'Keep it up! 💪'].join('\n'),
    ['You reached a milestone! 🏅', `You've already played ${userGameLogs.length} games!`, 'Amazing! Keep playing and enjoying! 🎲'].join('\n'),
    ['What a player! 👑', `You passed the ${userGameLogs.length} questions threshold!`, 'Well done!'].join('\n'),
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function generateSpecialMessage(userGameLogs: GameLog[]): string {
  const sorted = userGameLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const correctStreakMsg = getStreakOfCorrectMessages(sorted);
  if (correctStreakMsg) return correctStreakMsg;

  const daysStreakMsg = getStreakOfDaysPlayed(sorted);
  if (daysStreakMsg) return daysStreakMsg;

  const totalGamesMsg = getTotalGamesPlayedMessages(sorted);
  if (totalGamesMsg) return totalGamesMsg;

  return null;
}

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
      `💣 Today: ${todayCorrectGames.length}/${todayGameLogs.length}`,
      todayCorrectGames.length ? `-` : '',
      todayCorrectGames.length ? `${((todayCorrectGames.length / todayGameLogs.length) * 100).toFixed(2)}%` : '',
    ].join(' '),
    `🤓 Current correct answers streak: ${currentCorrectAnsweredStreak}`,
    `🚀 Longest correct answers streak: ${longestCorrectAnsweredStreak}`,
    `💯 Current days streak: ${currentStreak}`,
    `🚀 Longest days streak: ${longestStreak}`,
  ].join('\n');
}
