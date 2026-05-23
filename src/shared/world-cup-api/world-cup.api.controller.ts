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
  findAllGuesses,
  findGuessesByUser,
  findGuessByUserAndMatch,
  upsertGuess,
  upsertUser,
  setNotifications,
  setDisplayName,
  findUserByTelegramId,
  findAllUsers,
} from '@shared/world-cup';
import { worldCupAuthMiddleware } from './auth.middleware';
import type { GuessBody, GuessResponse, LeaderboardDto, MatchdayDto, MatchDetailDto, MatchDto, ProfileDto } from './dto';
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

      const myRank = entries.findIndex((e) => e.telegramUserId === telegramUserId) + 1;
      const dto: LeaderboardDto = { entries, myRank: myRank > 0 ? myRank : undefined };
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
      for (const guess of userGuesses) {
        const match = findMatchById(allMatches, guess.matchId);
        if (!match || classifyMatchStatus(match) !== 'finished') continue;
        totalPoints += computePoints({ home: guess.home, away: guess.away }, { home: match.homeCompetitor.score, away: match.awayCompetitor.score });
        guessCount++;
      }

      const dto: ProfileDto = {
        telegramUserId: user.telegramUserId,
        firstName: user.firstName,
        displayName: user.displayName,
        username: user.username,
        totalPoints,
        guessCount,
        notificationsEnabled: user.notificationsEnabled,
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
      const matchdayKey = req.params.key;
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

  logger.log('World Cup API routes registered');
}
