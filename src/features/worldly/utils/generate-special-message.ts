import { GameLog } from '@core/mongo/worldly-mongo';
import { getDateString } from '@core/utils';
import { getLongestStreak, getStreak, getStreakOfCorrectAnswers } from '../utils';

export const SPECIAL_STREAK_OF_DAYS_MIN = 4;
export const SPECIAL_CORRECT_ANSWERS_STREAKS = [4, 7, 10, 15, 20, 30];
export const SPECIAL_AMOUNT_OF_TOTAL_GAMES_PLAYED = [10, 50];

export function getStreakOfCorrectMessages(userGameLogs: GameLog[]): string {
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
    ['בונא מישהו פה נותן בראש! 🎉', `${streak} תשובות נכונות ברצף! 🔥`, 'תמשיך ככה! 💪'].join('\n'),
    ['איזה תותח! 👏', `ענית נכון ${streak} פעמים ברצף!`, 'המשך כך, אתה בדרך הנכונה! 🚀'].join('\n'),
    ['וואו! 🏅', `${streak} תשובות נכונות ברצף!`, 'אלוף! 🦸‍♂️'].join('\n'),
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getStreakOfDaysPlayed(userGameLogs: GameLog[]): string {
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

export function getTotalGamesPlayedMessages(userGameLogs: GameLog[]): string {
  const indexOfSpecialStreak = SPECIAL_AMOUNT_OF_TOTAL_GAMES_PLAYED.indexOf(userGameLogs.length);
  const isHundredth = userGameLogs.length % 100 === 0;
  if (indexOfSpecialStreak === -1 && !isHundredth) {
    return null;
  }
  const messages = [
    [`הופה הופה!! 🎉`, 'שיחקת מספר מיוחד של משחקים! 🔥', `${userGameLogs.length} משחקים!`, `תמשיך ככה! 💪`].join('\n'),
    [`הגעת לאבן דרך! 🏅`, `שיחקת כבר ${userGameLogs.length} משחקים!`, `מדהים! המשך לשחק ולהנות! 🎲`].join('\n'),
    [`איזה שחקן! 👑`, `עברת את רף ה-${userGameLogs.length} משחקים!`, `כל הכבוד!`].join('\n'),
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
      `💣`,
      `היום:`,
      `${todayCorrectGames.length}/${todayGameLogs.length}`,
      todayCorrectGames.length ? `-` : '',
      todayCorrectGames.length ? `${((todayCorrectGames.length / todayGameLogs.length) * 100).toFixed(2)}%` : '',
    ].join(' '),
    [`🤓`, 'רצף התשובות הנכונות הנוכחי:', `${currentCorrectAnsweredStreak}`].join(' '),
    [`🚀`, 'רצף התשובות הנכונות הכי ארוך:', `${longestCorrectAnsweredStreak}`].join(' '),
    [`💯`, 'רצף הימים הנוכחי:', `${currentStreak}`].join(' '),
    [`🚀`, 'רצף הימים הכי ארוך:', `${longestStreak}`].join(' '),
  ].join('\n');
}
