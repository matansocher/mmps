import { GameLogModel } from '@core/mongo/worldly-mongo';
import { getSpecialNumber } from '@core/utils';
import { getStreak } from '../utils';

export const SPECIAL_STREAK_OF_DAYS_MIN = 4;
export const SPECIAL_CORRECT_ANSWERS_STREAKS = [7, 20, 30];
export const SPECIAL_AMOUNT_OF_TOTAL_GAMES_PLAYED = [10, 50, 100, 200, 300, 500, 600, 700, 800, 900, 1000];

function getStreakOfCorrectMessages(userGameLogs: GameLogModel[]): string {
  let streak = 0;
  const sortedLogs = userGameLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  for (let i = 0; i < sortedLogs.length; i++) {
    if (sortedLogs[i].correct === sortedLogs[i].selected) {
      streak++;
    } else {
      break;
    }
  }
  if (SPECIAL_CORRECT_ANSWERS_STREAKS.includes(streak)) {
    return [
      // br
      'בונא מישהו פה נותן בראש! 🎉',
      `${streak} תשובות נכונות ברצף! 🔥`,
      'תמשיך ככה! 💪',
    ].join('\n');
  }
  return null;
}

function getStreakOfDaysPlayed(userGameLogs: GameLogModel[]): string {
  const dates = userGameLogs.map((log) => new Date(log.createdAt));
  const streak = getStreak(dates);
  if (streak < SPECIAL_STREAK_OF_DAYS_MIN) {
    return null;
  }
  return [
    // br
    `וואלק אני רוצה להגיד כל הכבוד על ההתמדה! 🎉`,
    ['לשחק כבר', streak, 'ימים כל יום זה אש 🔥'].join(' '),
    `תמשיך ככה! 💪`,
  ].join('\n');
}

function getTotalGamesPlayedMessages(userGameLogs: GameLogModel[]): string {
  const indexOfSpecialStreak = SPECIAL_AMOUNT_OF_TOTAL_GAMES_PLAYED.indexOf(userGameLogs.length);
  if (indexOfSpecialStreak === -1) {
    return null;
  }
  return [
    // br
    `הופה הופה!! 🎉`,
    'שיחקת מספר מיוחד של משחקים! 🔥',
    `${getSpecialNumber(userGameLogs.length)} משחקים!`,
    `תמשיך ככה! 💪`,
  ].join('\n');
}

export function generateSpecialMessage(chatId: number, userGameLogs: GameLogModel[]): string {
  const correctStreakMsg = getStreakOfCorrectMessages(userGameLogs);
  if (correctStreakMsg) return correctStreakMsg;

  const daysStreakMsg = getStreakOfDaysPlayed(userGameLogs);
  if (daysStreakMsg) return daysStreakMsg;

  const totalGamesMsg = getTotalGamesPlayedMessages(userGameLogs);
  if (totalGamesMsg) return totalGamesMsg;

  return null;
}
