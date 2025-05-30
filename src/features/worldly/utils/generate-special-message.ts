import { GameLogModel } from '@core/mongo/worldly-mongo';
import { getDateString, getSpecialNumber } from '@core/utils';
import { getStreak } from '../utils';

export const SPECIAL_STREAK_OF_DAYS_MIN = 4;
export const SPECIAL_CORRECT_ANSWERS_STREAKS = [4, 7, 10, 15, 20, 30];
export const SPECIAL_AMOUNT_OF_TOTAL_GAMES_PLAYED = [10, 50, 100, 200, 300, 500, 600, 700, 800, 900, 1000];

function getStreakOfCorrectMessages(userGameLogs: GameLogModel[]): string {
  let streak = 0;
  for (let i = 0; i < userGameLogs.length; i++) {
    if (userGameLogs[i].correct === userGameLogs[i].selected) {
      streak++;
    } else {
      break;
    }
  }
  if (SPECIAL_CORRECT_ANSWERS_STREAKS.includes(streak)) {
    const messages = [
      ['בונא מישהו פה נותן בראש! 🎉', `${streak} תשובות נכונות ברצף! 🔥`, 'תמשיך ככה! 💪'].join('\n'),
      ['איזה תותח! 👏', `ענית נכון ${streak} פעמים ברצף!`, 'המשך כך, אתה בדרך הנכונה! 🚀'].join('\n'),
      ['וואו, שיא חדש! 🏅', `${streak} תשובות נכונות אחת אחרי השנייה!`, 'אלוף! 🦸‍♂️'].join('\n'),
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  return null;
}

function getStreakOfDaysPlayed(userGameLogs: GameLogModel[]): string {
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
    [`וואלק אני רוצה להגיד כל הכבוד על ההתמדה! 🎉`, ['לשחק כבר', streak, 'ימים כל יום זה אש 🔥'].join(' '), `תמשיך ככה! 💪`].join('\n'),
    [`איזה התמדה! 👏`, `אתה משחק כבר ${streak} ימים ברצף!`, `מדהים! תמשיך להגיע כל יום! 🌟`].join('\n'),
    [`שחקן קבוע! 🏆`, `כבר ${streak} ימים ברצף במשחק!`, `כל הכבוד על ההתמדה! 🔥`].join('\n'),
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getTotalGamesPlayedMessages(userGameLogs: GameLogModel[]): string {
  const indexOfSpecialStreak = SPECIAL_AMOUNT_OF_TOTAL_GAMES_PLAYED.indexOf(userGameLogs.length);
  if (indexOfSpecialStreak === -1) {
    return null;
  }
  const specialNumber = getSpecialNumber(userGameLogs.length);
  const messages = [
    [`הופה הופה!! 🎉`, 'שיחקת מספר מיוחד של משחקים! 🔥', `${specialNumber} משחקים!`, `תמשיך ככה! 💪`].join('\n'),
    [`הגעת לאבן דרך! 🏅`, `שיחקת כבר ${specialNumber} משחקים!`, `מדהים! המשך לשחק ולהנות! 🎲`].join('\n'),
    [`איזה שחקן! 👑`, `עברת את רף ה-${specialNumber} משחקים!`, `כל הכבוד!`].join('\n'),
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function generateSpecialMessage(userGameLogs: GameLogModel[]): string {
  const sorted = userGameLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const correctStreakMsg = getStreakOfCorrectMessages(sorted);
  if (correctStreakMsg) return correctStreakMsg;

  const daysStreakMsg = getStreakOfDaysPlayed(sorted);
  if (daysStreakMsg) return daysStreakMsg;

  const totalGamesMsg = getTotalGamesPlayedMessages(sorted);
  if (totalGamesMsg) return totalGamesMsg;

  return null;
}
