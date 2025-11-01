import { Player, UserStats } from '@shared/striker';

export function getPlayerName(player: Player): string {
  return player.commonName || `${player.firstName} ${player.lastName}`;
}

export const WELCOME_MESSAGE = `⚽ Welcome to Striker Guessing Game! ⚽

I'll give you hints about a football player, and you need to guess who it is!

🎮 How to Play:
• Type /play to start a new game
• I'll show you the first hint
• Type your guess anytime
• Use /clue to reveal the next hint
• The fewer hints you use, the higher your score!

🏆 Scoring:
• 1st hint (Position) = 5 points
• 2nd hint (+ Nationality) = 4 points
• 3rd hint (+ Club) = 3 points
• 4th hint (+ Rating) = 2 points
• 5th hint (+ Preferred Foot) = 1 point

📊 Commands:
/play - Start a new game
/clue - Reveal the next hint
/stats - View your statistics
/giveup - Give up and see the answer
/help - Show this help message

Good luck! 🍀`;

export const ALREADY_PLAYING_MESSAGE = `⚠️ You already have an active game!

Please finish your current game or use /giveup to start a new one.`;

export const CLUE_REVEALED_MESSAGE = `💡 New hint revealed!`;

export const NO_ACTIVE_GAME_MESSAGE = `❌ No active game found.

Start a new game with /play! ⚽`;

export const NO_MORE_CLUES_MESSAGE = `⚠️ All hints have been revealed!

You have all the information available. Keep guessing or use /giveup to see the answer.`;

export const NO_STATS_MESSAGE = `📊 You haven't played any games yet!

Start playing with /play to build your stats! ⚽`;

export const HELP_MESSAGE = `⚽ Striker Guessing Game - Help

🎮 How to Play:
1. Use /play to start a new game
2. Read the hint carefully
3. Type your guess (player's name) OR
4. Use /clue to reveal the next hint
5. Keep guessing until you get it right!

💡 Tips:
• You can type just the last name (e.g., "Mbappe")
• Spelling doesn't have to be perfect - fuzzy matching helps!
• Try to guess with fewer hints for maximum points
• Use /clue strategically when you need more info

🏆 Scoring System:
The earlier you guess, the more points you earn:
• Position only = 5 pts ⭐⭐⭐⭐⭐
• + Nationality = 4 pts ⭐⭐⭐⭐
• + Club = 3 pts ⭐⭐⭐
• + Rating = 2 pts ⭐⭐
• + Preferred Foot = 1 pt ⭐

📊 Track your progress with /stats
❌ Give up anytime with /giveup

Good luck! ⚽`;

export function formatGiveUpMessage(player: Player): string {
  return `❌ Game Over!

The answer was: ${getPlayerName(player)}

📊 Player Info:
• Position: ${player.position}
• Nationality: ${player.nationality}
• Club: ${player.team}
• Overall Rating: ${player.overallRating}
• Preferred Foot: ${player.preferredFoot}

Better luck next time! 💪
▶️ Try again with /play`;
}

export function formatHintMessage(player: Player, hintsRevealed: number): string {
  let message = '⚽ Guess the Football Player!\n\n';
  message += '📋 Hints:\n';

  if (hintsRevealed >= 1) {
    message += `1️⃣ Position: ${player.position}\n`;
  }

  if (hintsRevealed >= 2) {
    message += `2️⃣ Nationality: ${player.nationality}\n`;
  }

  if (hintsRevealed >= 3) {
    message += `3️⃣ Club: ${player.team}\n`;
  }

  if (hintsRevealed >= 4) {
    message += `4️⃣ Overall Rating: ${player.overallRating}\n`;
  }

  if (hintsRevealed >= 5) {
    message += `5️⃣ Preferred Foot: ${player.preferredFoot}\n`;
  }

  message += '\n💭 Type your guess now!';

  if (hintsRevealed < 5) {
    message += '\n\n💡 Need more info? Use /clue for the next hint';
  } else {
    message += '\n\n⚠️ This is the last hint!';
    message += "\n❌ Can't guess? Use /giveup to reveal the answer";
  }

  return message;
}

export function formatStatsMessage(stats: UserStats): string {
  const winRate = stats.totalGames > 0 ? ((stats.correctGuesses / stats.totalGames) * 100).toFixed(1) : '0.0';

  let message = `📊 Your Statistics\n\n`;
  message += `🎮 Total Games: ${stats.totalGames}\n`;
  message += `✅ Correct Guesses: ${stats.correctGuesses}\n`;
  message += `📈 Win Rate: ${winRate}%\n`;
  message += `🏆 Total Score: ${stats.totalScore} points\n`;
  message += `💡 Avg Hints Used: ${stats.averageHintsUsed.toFixed(1)}\n`;
  message += `🔥 Current Streak: ${stats.currentStreak}\n`;
  message += `⭐ Best Streak: ${stats.bestStreak}\n\n`;

  if (stats.totalScore >= 100) {
    message += `🏆 Badge: LEGEND\n`;
  } else if (stats.totalScore >= 50) {
    message += `⭐ Badge: EXPERT\n`;
  } else if (stats.totalScore >= 20) {
    message += `👍 Badge: ENTHUSIAST\n`;
  } else if (stats.totalScore > 0) {
    message += `🌱 Badge: ROOKIE\n`;
  } else {
    message += `🆕 Play your first game!\n`;
  }

  message += `\n▶️ Play more with /play`;

  return message;
}

export function formatSuccessMessage(player: Player, score: number, hintsUsed: number, guesses: string[]): string {
  let message = `🎉 Correct! It's ${getPlayerName(player)}! 🎉\n\n`;

  let scoreEmoji = '';
  if (score === 5) scoreEmoji = '⭐⭐⭐⭐⭐';
  else if (score === 4) scoreEmoji = '⭐⭐⭐⭐';
  else if (score === 3) scoreEmoji = '⭐⭐⭐';
  else if (score === 2) scoreEmoji = '⭐⭐';
  else scoreEmoji = '⭐';

  message += `${scoreEmoji} Score: ${score} points\n`;
  message += `💡 Hints used: ${hintsUsed}/5\n`;
  message += `🎯 Attempts: ${guesses.length}\n\n`;

  if (score === 5) {
    message += `🏆 AMAZING! You're a football expert!\n`;
  } else if (score === 4) {
    message += `👏 GREAT! You know your players well!\n`;
  } else if (score === 3) {
    message += `👍 GOOD! Nice knowledge!\n`;
  } else if (score === 2) {
    message += `✓ Not bad! Keep playing to improve!\n`;
  } else {
    message += `💪 You got it! Practice makes perfect!\n`;
  }

  message += `\n▶️ Play again with /play`;

  return message;
}

export function formatWrongGuessMessage(guess: string, hintsRevealed: number): string {
  let message = `❌ Not quite! "${guess}" is incorrect.\n\n`;

  if (hintsRevealed < 5) {
    message += `💡 Use /clue to reveal the next hint, or keep guessing!`;
  } else {
    message += `⚠️ All hints revealed! Keep trying or /giveup`;
  }

  return message;
}
