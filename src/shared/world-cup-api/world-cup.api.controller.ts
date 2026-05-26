import type { Express, Request, Response } from 'express';
import { Logger } from '@core/utils';
import type { TelegramBotConfig } from '@services/telegram';
import { classifyMatchStatus } from '@shared/sports';
import { fetchRichMatch } from '@shared/coach-api/match-fetcher';
import {
  computePoints,
  findMatchById,
  getMatchdayKey,
  getWorldCupMatches,
  getWorldCupScheduledMatches,
  getWorldCupStandings,
  getTournamentStats,
  findAllGuesses,
  findGuessesByUser,
  findGuessesByMatchIds,
  findGuessByUserAndMatch,
  upsertGuess,
  upsertUser,
  setNotifications,
  setDisplayName,
  findUserByTelegramId,
  findAllUsers,
  getLeaderboardSnapshot,
  WORLD_CUP_TEAMS,
} from '@shared/world-cup';
import { getPregameData } from '@services/scores-365';
import { worldCupAuthMiddleware } from './auth.middleware';
import type { GuessBody, GuessResponse, H2HDto, LeaderboardDto, MatchdayDto, MatchDetailDto, MatchDto, ProfileDto, UserStatsDto } from './dto';
import { toMatchDto } from './dto';

const logger = new Logger('WorldCupApiController');

export type WorldCupApiDeps = {
  readonly botConfig: TelegramBotConfig;
};

export function registerWorldCupApiRoutes(app: Express, _deps: WorldCupApiDeps): void {
  const prefix = '/api/world-cup';

  app.use(prefix, worldCupAuthMiddleware);

  // GET /api/world-cup/matches — all matches with user's guesses
  app.get(`${prefix}/matches`, async (req: Request, res: Response) => {
    try {
      const { telegramUserId } = req.worldCupUser!;
      const matches = await getWorldCupMatches();
      const userGuesses = await findGuessesByUser(telegramUserId);
      const guessMap = new Map(userGuesses.map((g) => [g.matchId, g]));

      const dtos: MatchDto[] = matches.map((m) => {
        const status = classifyMatchStatus(m);
        const guess = guessMap.get(m.id);
        let points: number | undefined;
        if (guess && status === 'finished') {
          points = computePoints({ home: guess.home, away: guess.away }, { home: m.homeCompetitor.score, away: m.awayCompetitor.score });
        }
        return toMatchDto(m, status, guess, points);
      });

      res.json({ matches: dtos });
    } catch (err) {
      logger.error(`GET ${prefix}/matches error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // GET /api/world-cup/matches/upcoming — scheduled matches only
  app.get(`${prefix}/matches/upcoming`, async (req: Request, res: Response) => {
    try {
      const { telegramUserId } = req.worldCupUser!;
      const matches = await getWorldCupScheduledMatches();
      const userGuesses = await findGuessesByUser(telegramUserId);
      const guessMap = new Map(userGuesses.map((g) => [g.matchId, g]));

      const dtos: MatchDto[] = matches.map((m) => toMatchDto(m, 'scheduled', guessMap.get(m.id)));
      res.json({ matches: dtos });
    } catch (err) {
      logger.error(`GET ${prefix}/matches/upcoming error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // POST /api/world-cup/guess — submit or update a guess
  app.post(`${prefix}/guess`, async (req: Request, res: Response) => {
    try {
      const { telegramUserId, firstName, username } = req.worldCupUser!;
      const { matchId, home, away } = req.body as GuessBody;

      if (typeof matchId !== 'number' || typeof home !== 'number' || typeof away !== 'number') {
        res.status(400).json({ error: 'invalid_body' });
        return;
      }
      if (home < 0 || away < 0 || !Number.isInteger(home) || !Number.isInteger(away)) {
        res.status(400).json({ error: 'invalid_score' });
        return;
      }

      // Ensure match exists and is scheduled
      const allMatches = await getWorldCupMatches();
      const match = findMatchById(allMatches, matchId);
      if (!match) {
        res.status(404).json({ error: 'match_not_found' });
        return;
      }
      if (classifyMatchStatus(match) !== 'scheduled') {
        res.status(400).json({ error: 'match_already_started' });
        return;
      }

      // Ensure user exists
      await upsertUser({ telegramUserId, chatId: telegramUserId, firstName: firstName ?? '', username, notificationsEnabled: true });

      const matchdayKey = getMatchdayKey(new Date(match.startTime));
      const guess = await upsertGuess({ telegramUserId, matchId, home, away, matchdayKey });

      const response: GuessResponse = { success: true, guess };
      res.json(response);
    } catch (err) {
      logger.error(`POST ${prefix}/guess error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // GET /api/world-cup/leaderboard — overall leaderboard
  app.get(`${prefix}/leaderboard`, async (req: Request, res: Response) => {
    try {
      const { telegramUserId } = req.worldCupUser!;
      const allMatches = await getWorldCupMatches();
      const allGuesses = await findAllGuesses();
      const allUsers = await findAllUsers();
      const userMap = new Map(allUsers.map((u) => [u.telegramUserId, u]));

      // Build points map
      const pointsMap = new Map<number, { points: number; guessCount: number }>();
      for (const guess of allGuesses) {
        const match = findMatchById(allMatches, guess.matchId);
        if (!match || classifyMatchStatus(match) !== 'finished') continue;
        const pts = computePoints({ home: guess.home, away: guess.away }, { home: match.homeCompetitor.score, away: match.awayCompetitor.score });
        const existing = pointsMap.get(guess.telegramUserId) ?? { points: 0, guessCount: 0 };
        pointsMap.set(guess.telegramUserId, { points: existing.points + pts, guessCount: existing.guessCount + 1 });
      }

      const entries = [...pointsMap.entries()]
        .map(([userId, { points, guessCount }]) => {
          const user = userMap.get(userId);
          return {
            telegramUserId: userId,
            firstName: user?.firstName ?? 'Unknown',
            lastName: user?.lastName,
            username: user?.username,
            displayName: user?.displayName,
            points,
            guessCount,
          };
        })
        .sort((a, b) => b.points - a.points);

      // Fallback to snapshot data when no finished matches exist yet
      const finalEntries = entries.length > 0 ? entries : await getLeaderboardSnapshot();

      const myRank = finalEntries.findIndex((e) => e.telegramUserId === telegramUserId) + 1;
      const dto: LeaderboardDto = { entries: finalEntries, myRank: myRank > 0 ? myRank : undefined };
      res.json(dto);
    } catch (err) {
      logger.error(`GET ${prefix}/leaderboard error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // GET /api/world-cup/profile — user profile with stats
  app.get(`${prefix}/profile`, async (req: Request, res: Response) => {
    try {
      const { telegramUserId } = req.worldCupUser!;
      const user = await findUserByTelegramId(telegramUserId);
      if (!user) {
        res.status(404).json({ error: 'user_not_found' });
        return;
      }

      const allMatches = await getWorldCupMatches();
      const userGuesses = await findGuessesByUser(telegramUserId);

      let totalPoints = 0;
      let guessCount = 0;
      let exactCount = 0;
      let gdCount = 0;
      let resultCount = 0;
      let wrongCount = 0;
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;
      const teamStats: Record<number, { correct: number; total: number }> = {};

      const finishedGuesses: { points: number; matchId: number }[] = [];
      for (const guess of userGuesses) {
        const match = findMatchById(allMatches, guess.matchId);
        if (!match || classifyMatchStatus(match) !== 'finished') continue;
        const pts = computePoints({ home: guess.home, away: guess.away }, { home: match.homeCompetitor.score, away: match.awayCompetitor.score });
        totalPoints += pts;
        guessCount++;
        finishedGuesses.push({ points: pts, matchId: guess.matchId });

        if (pts === 5) exactCount++;
        else if (pts === 3) gdCount++;
        else if (pts === 1) resultCount++;
        else wrongCount++;

        // Track team-level accuracy
        for (const teamId of [match.homeCompetitor.id, match.awayCompetitor.id]) {
          if (!teamStats[teamId]) teamStats[teamId] = { correct: 0, total: 0 };
          teamStats[teamId].total++;
          if (pts > 0) teamStats[teamId].correct++;
        }
      }

      // Compute streaks (sorted by match start time)
      const sortedGuesses = finishedGuesses.sort((a, b) => {
        const mA = findMatchById(allMatches, a.matchId);
        const mB = findMatchById(allMatches, b.matchId);
        return new Date(mA!.startTime).getTime() - new Date(mB!.startTime).getTime();
      });
      for (const g of sortedGuesses) {
        if (g.points > 0) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
          tempStreak = 0;
        }
      }
      currentStreak = tempStreak;

      // Find best/worst team (min 2 guesses)
      let bestTeam: UserStatsDto['bestTeam'];
      let worstTeam: UserStatsDto['worstTeam'];
      const teamEntries = Object.entries(teamStats).filter(([, s]) => s.total >= 2);
      if (teamEntries.length > 0) {
        const sorted = teamEntries.map(([id, s]) => ({ id: Number(id), accuracy: Math.round((s.correct / s.total) * 100) })).sort((a, b) => b.accuracy - a.accuracy);
        const bestId = sorted[0].id;
        const worstId = sorted[sorted.length - 1].id;
        const bestInfo = WORLD_CUP_TEAMS.find((t) => t.id === bestId);
        const worstInfo = WORLD_CUP_TEAMS.find((t) => t.id === worstId);
        if (bestInfo) bestTeam = { name: bestInfo.name, flag: bestInfo.flag, accuracy: sorted[0].accuracy };
        if (worstInfo && worstId !== bestId) worstTeam = { name: worstInfo.name, flag: worstInfo.flag, accuracy: sorted[sorted.length - 1].accuracy };
      }

      const stats: UserStatsDto = {
        accuracy: guessCount > 0 ? Math.round(((guessCount - wrongCount) / guessCount) * 100) : 0,
        exactCount,
        gdCount,
        resultCount,
        wrongCount,
        currentStreak,
        bestStreak,
        bestTeam,
        worstTeam,
      };

      const dto: ProfileDto = {
        telegramUserId: user.telegramUserId,
        firstName: user.firstName,
        displayName: user.displayName,
        username: user.username,
        totalPoints,
        guessCount,
        notificationsEnabled: user.notificationsEnabled,
        stats,
      };
      res.json(dto);
    } catch (err) {
      logger.error(`GET ${prefix}/profile error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // PATCH /api/world-cup/profile/notifications — toggle notifications
  app.patch(`${prefix}/profile/notifications`, async (req: Request, res: Response) => {
    try {
      const { telegramUserId } = req.worldCupUser!;
      const { enabled } = req.body as { enabled: boolean };
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'invalid_body' });
        return;
      }
      await setNotifications(telegramUserId, enabled);
      res.json({ success: true, notificationsEnabled: enabled });
    } catch (err) {
      logger.error(`PATCH ${prefix}/profile/notifications error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // PATCH /api/world-cup/profile/display-name — update display name for leaderboard
  app.patch(`${prefix}/profile/display-name`, async (req: Request, res: Response) => {
    try {
      const { telegramUserId } = req.worldCupUser!;
      const { displayName } = req.body as { displayName: string };
      if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0 || displayName.trim().length > 30) {
        res.status(400).json({ error: 'invalid_body' });
        return;
      }
      await setDisplayName(telegramUserId, displayName.trim());
      res.json({ success: true, displayName: displayName.trim() });
    } catch (err) {
      logger.error(`PATCH ${prefix}/profile/display-name error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // GET /api/world-cup/matchday/:key — matches for a specific matchday
  app.get(`${prefix}/matchday/:key`, async (req: Request, res: Response) => {
    try {
      const { telegramUserId } = req.worldCupUser!;
      const matchdayKey = req.params.key as string;
      const allMatches = await getWorldCupMatches();
      const userGuesses = await findGuessesByUser(telegramUserId);
      const guessMap = new Map(userGuesses.map((g) => [g.matchId, g]));

      const matchesInDay = allMatches.filter((m) => getMatchdayKey(new Date(m.startTime)) === matchdayKey);
      const dtos: MatchDto[] = matchesInDay.map((m) => {
        const status = classifyMatchStatus(m);
        const guess = guessMap.get(m.id);
        let points: number | undefined;
        if (guess && status === 'finished') {
          points = computePoints({ home: guess.home, away: guess.away }, { home: m.homeCompetitor.score, away: m.awayCompetitor.score });
        }
        return toMatchDto(m, status, guess, points);
      });

      const dto: MatchdayDto = { matchdayKey, matches: dtos };
      res.json(dto);
    } catch (err) {
      logger.error(`GET ${prefix}/matchday/:key error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // GET /api/world-cup/matches/:id — single match detail with events & lineups
  app.get(`${prefix}/matches/:id`, async (req: Request, res: Response) => {
    try {
      const { telegramUserId } = req.worldCupUser!;
      const matchId = Number(req.params.id);
      if (!Number.isFinite(matchId)) {
        res.status(400).json({ error: 'invalid_id' });
        return;
      }

      const allMatches = await getWorldCupMatches();
      const match = findMatchById(allMatches, matchId);
      if (!match) {
        res.status(404).json({ error: 'match_not_found' });
        return;
      }

      const status = classifyMatchStatus(match);
      const guess = await findGuessByUserAndMatch(telegramUserId, matchId);
      let points: number | undefined;
      if (guess && status === 'finished') {
        points = computePoints({ home: guess.home, away: guess.away }, { home: match.homeCompetitor.score, away: match.awayCompetitor.score });
      }

      const matchDto = toMatchDto(match, status, guess ?? undefined, points);
      const rich = await fetchRichMatch(matchId);

      const dto: MatchDetailDto = {
        match: matchDto,
        venue: rich?.venue,
        stage: rich?.stage,
        channel: rich?.channel,
        events: rich?.events ?? [],
        homeLineup: rich?.homeLineup
          ? {
              formation: rich.homeLineup.formation,
              starting: rich.homeLineup.starting.map((p) => ({ memberId: p.memberId, athleteId: p.athleteId, name: p.name, shortName: p.shortName, jerseyNumber: p.jerseyNumber, position: p.position, isStarting: true })),
              bench: rich.homeLineup.bench.map((p) => ({ memberId: p.memberId, athleteId: p.athleteId, name: p.name, shortName: p.shortName, jerseyNumber: p.jerseyNumber, position: p.position, isStarting: false })),
            }
          : undefined,
        awayLineup: rich?.awayLineup
          ? {
              formation: rich.awayLineup.formation,
              starting: rich.awayLineup.starting.map((p) => ({ memberId: p.memberId, athleteId: p.athleteId, name: p.name, shortName: p.shortName, jerseyNumber: p.jerseyNumber, position: p.position, isStarting: true })),
              bench: rich.awayLineup.bench.map((p) => ({ memberId: p.memberId, athleteId: p.athleteId, name: p.name, shortName: p.shortName, jerseyNumber: p.jerseyNumber, position: p.position, isStarting: false })),
            }
          : undefined,
      };

      res.json(dto);
    } catch (err) {
      logger.error(`GET ${prefix}/matches/:id error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // GET /api/world-cup/matches/:id/h2h — head-to-head data for a match
  app.get(`${prefix}/matches/:id/h2h`, async (req: Request, res: Response) => {
    try {
      const matchId = Number(req.params.id);
      if (!Number.isFinite(matchId)) {
        res.status(400).json({ error: 'invalid_id' });
        return;
      }

      const allMatches = await getWorldCupMatches();
      const match = findMatchById(allMatches, matchId);
      if (!match) {
        res.status(404).json({ error: 'match_not_found' });
        return;
      }

      // Fetch pregame data from 365scores
      const pregame = await getPregameData(matchId);

      // Parse team statistics comparison
      const teamStats: { name: string; homeValue: string; awayValue: string }[] = [];
      let gamesPlayed = '';

      if (pregame?.statisticGamesPlayed) {
        gamesPlayed = pregame.statisticGamesPlayed.homeText || '';
      }

      if (pregame?.statistics) {
        // Group stats by id — each stat id appears twice (once per competitor)
        const statMap: Record<number, { name: string; home?: string; away?: string }> = {};
        for (const stat of pregame.statistics) {
          if (!statMap[stat.id]) statMap[stat.id] = { name: stat.name || '' };
          if (stat.competitorId === match.homeCompetitor.id) {
            statMap[stat.id].home = stat.value || '';
          } else if (stat.competitorId === match.awayCompetitor.id) {
            statMap[stat.id].away = stat.value || '';
          }
        }
        // Only include stats that have both home and away values
        for (const entry of Object.values(statMap)) {
          if (entry.home && entry.away) {
            teamStats.push({ name: entry.name, homeValue: entry.home, awayValue: entry.away });
          }
        }
      }

      // Community prediction from user guesses
      const matchGuesses = await findGuessesByMatchIds([matchId]);
      let homeWins = 0;
      let draws = 0;
      let awayWins = 0;
      for (const g of matchGuesses) {
        if (g.home > g.away) homeWins++;
        else if (g.home === g.away) draws++;
        else awayWins++;
      }
      const total = matchGuesses.length || 1;
      const communityPrediction = {
        home: Math.round((homeWins / total) * 100),
        draw: Math.round((draws / total) * 100),
        away: Math.round((awayWins / total) * 100),
      };

      const dto: H2HDto = { teamStats, gamesPlayed, communityPrediction };
      res.json(dto);
    } catch (err) {
      logger.error(`GET ${prefix}/matches/:id/h2h error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // GET /api/world-cup/standings — group stage standings
  app.get(`${prefix}/standings`, async (_req: Request, res: Response) => {
    try {
      const standings = await getWorldCupStandings();
      res.json({ standings });
    } catch (err) {
      logger.error(`GET ${prefix}/standings error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  // GET /api/world-cup/stats — tournament statistics (top scorers, assists, cards)
  app.get(`${prefix}/stats`, async (_req: Request, res: Response) => {
    try {
      const stats = await getTournamentStats();
      res.json(stats);
    } catch (err) {
      logger.error(`GET ${prefix}/stats error: ${err}`);
      res.status(500).json({ error: 'internal_error' });
    }
  });

  logger.log('World Cup API routes registered');
}
