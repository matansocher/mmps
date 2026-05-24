import { Logger } from '@core/utils';
import type { MatchDetails } from '@services/scores-365';
import { provideTelegramBot } from '@services/telegram';
import { classifyMatchStatus } from '@shared/sports';
import { computePoints, findMatchById, getWorldCupMatches, getWorldCupScheduledMatches, findGuessesByMatchIds, findUsersWithNotifications, findGuessesByUser, findAllGuesses, findAllUsers, WORLD_CUP_TEAMS } from '@shared/world-cup';
import type { LeaderboardEntry } from '@shared/world-cup';
import { BOT_CONFIG } from './world-cup.config';

export class WorldCupService {
  private readonly logger = new Logger(WorldCupService.name);
  private readonly bot = provideTelegramBot(BOT_CONFIG);

  private getFlag(teamId: number): string {
    return WORLD_CUP_TEAMS.find((t) => t.id === teamId)?.flag ?? '';
  }

  async getUpcomingMatchesText(): Promise<string> {
    const matches = await getWorldCupScheduledMatches();
    if (!matches.length) return 'אין משחקים קרובים כרגע.';

    const lines = matches.slice(0, 10).map((m) => {
      const date = new Date(m.startTime).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });
      return `⚽ ${this.getFlag(m.homeCompetitor.id)} ${m.homeCompetitor.name} נגד ${m.awayCompetitor.name} ${this.getFlag(m.awayCompetitor.id)}\n📅 ${date}\n🏟️ ${m.venue}`;
    });
    return `🏆 משחקי מונדיאל קרובים\n\n${lines.join('\n\n')}`;
  }

  async sendMatchdayReminders(): Promise<void> {
    const users = await findUsersWithNotifications();
    if (!users.length) return;

    const matches = await getWorldCupScheduledMatches();
    // Filter matches starting in the next 24h
    const now = Date.now();
    const upcomingToday = matches.filter((m) => {
      const start = new Date(m.startTime).getTime();
      return start > now && start - now < 24 * 60 * 60 * 1000;
    });

    if (!upcomingToday.length) return;

    const matchLines = upcomingToday.map((m) => {
      const time = new Date(m.startTime).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', timeStyle: 'short' });
      return `${this.getFlag(m.homeCompetitor.id)} ${m.homeCompetitor.name} נגד ${m.awayCompetitor.name} ${this.getFlag(m.awayCompetitor.id)} (${time})`;
    });

    const message = `🔔 תזכורת יום משחק!\n\n${matchLines.join('\n')}\n\nאל תשכחו לשלוח ניחושים!`;

    for (const user of users) {
      try {
        await this.bot.api.sendMessage(user.chatId, message);
      } catch (err: any) {
        if (err.message?.includes('Forbidden')) {
          this.logger.warn(`User ${user.telegramUserId} blocked the bot`);
        }
      }
    }
  }

  async sendMatchResults(finishedMatches: MatchDetails[]): Promise<void> {
    if (!finishedMatches.length) return;

    const users = await findUsersWithNotifications();
    if (!users.length) return;

    const matchIds = finishedMatches.map((m) => m.id);
    const allGuesses = await findGuessesByMatchIds(matchIds);

    for (const user of users) {
      const userGuesses = allGuesses.filter((g) => g.telegramUserId === user.telegramUserId);
      if (!userGuesses.length) continue;

      const lines = userGuesses.map((g) => {
        const match = findMatchById(finishedMatches, g.matchId);
        if (!match) return '';
        const pts = computePoints({ home: g.home, away: g.away }, { home: match.homeCompetitor.score, away: match.awayCompetitor.score });
        const emoji = pts === 5 ? '🎯' : pts === 3 ? '✅' : pts === 1 ? '👍' : '❌';
        return `${emoji} ${this.getFlag(match.homeCompetitor.id)} ${match.homeCompetitor.name} ${match.homeCompetitor.score}-${match.awayCompetitor.score} ${match.awayCompetitor.name} ${this.getFlag(match.awayCompetitor.id)}\n   הניחוש שלך: ${g.home}-${g.away} (+${pts} נק׳)`;
      }).filter(Boolean);

      if (!lines.length) continue;
      const message = `📊 תוצאות משחקים\n\n${lines.join('\n\n')}`;
      try {
        await this.bot.api.sendMessage(user.chatId, message);
      } catch (err: any) {
        if (err.message?.includes('Forbidden')) {
          this.logger.warn(`User ${user.telegramUserId} blocked the bot`);
        }
      }
    }
  }

  async getLeaderboardText(): Promise<string> {
    const allMatches = await getWorldCupMatches();
    const allGuesses = await findAllGuesses();
    const allUsers = await findAllUsers();
    const userMap = new Map(allUsers.map((u) => [u.telegramUserId, u]));

    const pointsMap = new Map<number, { points: number; guessCount: number }>();
    for (const guess of allGuesses) {
      const match = findMatchById(allMatches, guess.matchId);
      if (!match || classifyMatchStatus(match) !== 'finished') continue;
      const pts = computePoints({ home: guess.home, away: guess.away }, { home: match.homeCompetitor.score, away: match.awayCompetitor.score });
      const existing = pointsMap.get(guess.telegramUserId) ?? { points: 0, guessCount: 0 };
      pointsMap.set(guess.telegramUserId, { points: existing.points + pts, guessCount: existing.guessCount + 1 });
    }

    const entries: LeaderboardEntry[] = [...pointsMap.entries()]
      .map(([userId, { points, guessCount }]) => {
        const user = userMap.get(userId);
        return { telegramUserId: userId, firstName: user?.firstName ?? 'Unknown', lastName: user?.lastName, username: user?.username, points, guessCount };
      })
      .sort((a, b) => b.points - a.points);

    if (!entries.length) return 'עדיין אין ניחושים. היו הראשונים!';

    const lines = entries.slice(0, 10).map((e, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const name = e.username ? `@${e.username}` : e.firstName;
      return `${medal} ${name} — ${e.points} נק׳ (${e.guessCount} ניחושים)`;
    });
    return `🏆 טבלת דירוג\n\n${lines.join('\n')}`;
  }

  async sendDailyDigest(): Promise<void> {
    const allMatches = await getWorldCupMatches();

    // Look at yesterday's matches (digest runs at 11:00, games in US timezone finish late Israel time)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

    const finishedMatches = allMatches.filter((m) => {
      const matchDate = new Date(m.startTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
      return matchDate === yesterdayStr && classifyMatchStatus(m) === 'finished';
    });

    if (!finishedMatches.length) return;

    const users = await findUsersWithNotifications();
    if (!users.length) return;

    const allGuesses = await findAllGuesses();

    // Build overall leaderboard for rank info
    const pointsMap = new Map<number, { points: number; guessCount: number }>();
    for (const guess of allGuesses) {
      const match = findMatchById(allMatches, guess.matchId);
      if (!match || classifyMatchStatus(match) !== 'finished') continue;
      const pts = computePoints({ home: guess.home, away: guess.away }, { home: match.homeCompetitor.score, away: match.awayCompetitor.score });
      const existing = pointsMap.get(guess.telegramUserId) ?? { points: 0, guessCount: 0 };
      pointsMap.set(guess.telegramUserId, { points: existing.points + pts, guessCount: existing.guessCount + 1 });
    }

    const leaderboard = [...pointsMap.entries()]
      .sort(([, a], [, b]) => b.points - a.points)
      .map(([userId], i) => ({ userId, rank: i + 1 }));

    const matchIds = finishedMatches.map((m) => m.id);
    const dayGuesses = allGuesses.filter((g) => matchIds.includes(g.matchId));

    for (const user of users) {
      const userGuesses = dayGuesses.filter((g) => g.telegramUserId === user.telegramUserId);
      let dayPoints = 0;

      const resultLines = finishedMatches.map((match) => {
        const guess = userGuesses.find((g) => g.matchId === match.id);
        const actualScore = `${match.homeCompetitor.score}-${match.awayCompetitor.score}`;
        const result = `${this.getFlag(match.homeCompetitor.id)} ${match.homeCompetitor.name} ${actualScore} ${match.awayCompetitor.name} ${this.getFlag(match.awayCompetitor.id)}`;

        if (!guess) return `⬜ ${result} (לא ניחשת)`;

        const pts = computePoints({ home: guess.home, away: guess.away }, { home: match.homeCompetitor.score, away: match.awayCompetitor.score });
        dayPoints += pts;
        const emoji = pts === 5 ? '🎯' : pts === 3 ? '✅' : pts === 1 ? '👍' : '❌';
        return `${emoji} ${result}\n   ניחשת: ${guess.home}-${guess.away} (+${pts})`;
      });

      const rankEntry = leaderboard.find((e) => e.userId === user.telegramUserId);
      const totalData = pointsMap.get(user.telegramUserId);
      const rankLine = rankEntry ? `📊 מקום ${rankEntry.rank} מתוך ${leaderboard.length} | סה״כ ${totalData?.points ?? 0} נק׳` : '';

      const displayDate = yesterdayStr.split('-').reverse().slice(0, 2).join('.');
      const message = [
        `📋 סיכום אתמול — ${displayDate}`,
        '',
        ...resultLines,
        '',
        dayPoints > 0 ? `💰 הרווחת אתמול: +${dayPoints} נקודות` : '😢 0 נקודות אתמול',
        rankLine,
      ].filter(Boolean).join('\n');

      try {
        await this.bot.api.sendMessage(user.chatId, message);
      } catch (err: any) {
        if (err.message?.includes('Forbidden')) {
          this.logger.warn(`User ${user.telegramUserId} blocked the bot`);
        }
      }
    }
  }
}
