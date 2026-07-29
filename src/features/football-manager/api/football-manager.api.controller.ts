import type { Express, Request, Response } from 'express';
import { isProd } from '@core/config';
import { Logger } from '@core/utils';
import { FM_SESSION_COOKIE, FM_SESSION_TTL_SECONDS } from '../constants';
import {
  aggregateTopScorers,
  appendLiveMatchDecision,
  createBid,
  createCareer,
  clearLiveMatches,
  clearTransferState,
  executeTransfer,
  expireStaleOffers,
  finishLiveMatch,
  getActiveBids,
  getAllFixtures,
  getAllLeagues,
  getBidById,
  getCareerByUser,
  getCareerTeam,
  getEffectiveSquad,
  getEffectiveSquads,
  getEffectiveTeamId,
  getFixturesForMatchday,
  getLiveMatch,
  getMaxMatchday,
  getOfferById,
  getPendingOffers,
  getPlayerById,
  getTeamById,
  getTeamsByLeague,
  getTransferNews,
  recordMatchdayResults,
  resetCareerTransfers,
  searchMarket,
  setLiveMatchMinute,
  startLiveMatch,
  startNewSeason,
  updateBidStatus,
  updateOfferStatus,
  upsertUser,
  applyMatchdayProgress,
  applySeasonAging,
  availabilityAt,
  effectiveOverallFor,
  getLineup,
  getStatsMap,
  resetProgression,
  resolveMatchdaySquad,
  setLineup,
  getAllTeams,
} from '../mongo';
import { computeStandings, DEFAULT_FORMATION, FORMATION_IDS, FORMATIONS, type FormationId, FULL_TIME_MINUTE, type MatchDecision, type MatchOutcome } from '../engine';
import { simulateFixture, timelineForFixture } from '../match.service';
import { buildProgressedTeamInput, buildUserTeamInput } from '../squad.service';
import { buildLiveSquads, buildLiveView } from '../live-match.service';
import { MAX_SUBS_PER_MATCH } from '../constants';
import { canAfford, canSign, decideOnBid, initClubBudget, openWindowForMatchday, runAiTransferRound } from '../transfer';
import type { AuthedRequest } from './auth.middleware';
import { requireAuth } from './auth.middleware';
import type { CareerDocument, FixtureDocument } from '../types';
import { handleImageProxy, IMAGE_PROXY_PREFIX, toProxyUrl } from './image-proxy';
import { isDevLoginAllowed, isGoogleAuthConfigured, verifyGoogleIdToken } from './google-auth';
import { createSessionToken } from './session';

const logger = new Logger('FootballManagerApi');

function proxyTeam<T extends { logoUrl?: string } | null | undefined>(team: T): T {
  if (!team) return team;
  return { ...team, logoUrl: toProxyUrl(team.logoUrl) } as T;
}

function proxyPlayer<T extends { faceUrl?: string; flagUrl?: string }>(player: T): T {
  return { ...player, faceUrl: toProxyUrl(player.faceUrl), flagUrl: toProxyUrl(player.flagUrl) } as T;
}

// Computes a season summary: final table (crests proxied), the user's finishing
// position, the champion, and the golden-boot winner.
async function buildSeasonSummary(careerId: string, seasonNumber: number, leagueId: number, clubTeamId: number) {
  const [teams, fixtures, scorerRows] = await Promise.all([getTeamsByLeague(leagueId), getAllFixtures(careerId, seasonNumber), aggregateTopScorers(careerId, seasonNumber)]);
  const teamIds = new Set(teams.map((t) => t.eaTeamId));
  const standings = computeStandings(teams, fixtures).map((row) => ({ ...row, logoUrl: toProxyUrl(row.logoUrl) }));
  const clubIndex = standings.findIndex((s) => s.teamId === clubTeamId);
  const champion = standings[0] ? { teamId: standings[0].teamId, teamName: standings[0].teamName } : { teamId: 0, teamName: '' };
  const top = scorerRows.find((r) => teamIds.has(r.teamId)) ?? null;
  const topScorer = top ? { playerId: top.playerId, playerName: top.playerName, teamName: teams.find((t) => t.eaTeamId === top.teamId)?.name ?? '', goals: top.goals } : null;
  return { seasonNumber, clubPosition: clubIndex >= 0 ? clubIndex + 1 : 0, champion, topScorer, standings };
}

function sessionCookie(value: string, maxAge: number): string {
  const secure = isProd ? '; Secure' : '';
  return `${FM_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function setSession(res: Response, userId: string): void {
  res.setHeader('Set-Cookie', sessionCookie(createSessionToken(userId), FM_SESSION_TTL_SECONDS));
}

// Simulates and commits the whole current matchday, then advances the career.
// `userDecisions` lets the caller (the live-match finish flow) feed the manager's
// in-match tactics into the user fixture; all other fixtures use the instant sim.
// Returns the enriched result payload shared by /advance and /match/finish.
//
// Phase 5: every team's sim input uses PROGRESSION-adjusted overalls (form /
// morale / fitness / aging), and the user's team uses the resolved persistent
// XI (injured/suspended players dropped, best available auto-filled). After the
// results are recorded, the user squad's form/morale/fitness/injuries/cards are
// updated from how the match went.
async function commitMatchday(career: CareerDocument, userDecisions: readonly MatchDecision[] = []) {
  const fixtures = await getFixturesForMatchday(career._id, career.seasonNumber, career.currentMatchday);
  const teamIds = [...new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]))];
  const [teamDocs, squadByTeam, statsMap, lineup] = await Promise.all([
    Promise.all(teamIds.map((id) => getTeamById(id))),
    getEffectiveSquads(career._id, teamIds),
    getStatsMap(career._id),
    getLineup(career._id),
  ]);
  const teamById = new Map(teamDocs.filter((t): t is NonNullable<typeof t> => Boolean(t)).map((t) => [t.eaTeamId, t]));

  // Resolve the user's XI once so its starters/bench drive both the sim and the
  // post-match progression (minutes played).
  const userFixtureRef = fixtures.find((f) => f.isUserMatch);
  const userTeamId = career.clubTeamId;
  const userSquad = squadByTeam.get(userTeamId) ?? [];
  const userResolved = buildUserTeamInput({
    team: teamById.get(userTeamId)!,
    squad: userSquad,
    statsMap,
    currentMatchday: career.currentMatchday,
    savedLineup: lineup?.playerIds ?? [],
  });

  const inputFor = (teamId: number) => {
    const team = teamById.get(teamId)!;
    if (teamId === userTeamId) return userResolved.input;
    const squad = squadByTeam.get(teamId) ?? [];
    return buildProgressedTeamInput(team, squad, statsMap);
  };

  const results = fixtures.map((f) => {
    const homeInput = inputFor(f.homeTeamId);
    const awayInput = inputFor(f.awayTeamId);
    // The user fixture is committed from its (possibly tactics-adjusted) timeline
    // so the recorded score matches exactly what the manager watched.
    const sim = f.isUserMatch && userDecisions.length ? timelineForFixture(f, homeInput, awayInput, userDecisions) : simulateFixture(f, homeInput, awayInput);
    return { fixture: f, sim };
  });

  await recordMatchdayResults(
    career._id,
    career.seasonNumber,
    career.currentMatchday,
    results.map((r) => ({
      homeTeamId: r.fixture.homeTeamId,
      awayTeamId: r.fixture.awayTeamId,
      homeGoals: r.sim.homeGoals,
      awayGoals: r.sim.awayGoals,
      scorers: r.sim.goals.map((g) => ({ teamId: g.teamId, playerId: g.playerId, playerName: g.playerName })),
    })),
  );

  // Apply progression to the user's squad based on how the match went.
  const userResult = results.find((r) => r.fixture.isUserMatch);
  if (userResult && userFixtureRef) {
    const userGoals = userResult.fixture.homeTeamId === userTeamId ? userResult.sim.homeGoals : userResult.sim.awayGoals;
    const oppGoals = userResult.fixture.homeTeamId === userTeamId ? userResult.sim.awayGoals : userResult.sim.homeGoals;
    const outcome: MatchOutcome = userGoals > oppGoals ? 'win' : userGoals < oppGoals ? 'loss' : 'draw';
    const playerStats = buildUserPlayerStats(userResolved.starters, userSquad, userDecisions, userTeamId, userResult.sim.goals);
    await applyMatchdayProgress({
      careerId: career._id,
      currentMatchday: career.currentMatchday,
      outcome,
      playerStats,
      seedPrefix: `${career._id}:${career.seasonNumber}:${career.currentMatchday}`,
    });
  }

  const maxMatchday = await getMaxMatchday(career._id, career.seasonNumber);
  return {
    matchday: career.currentMatchday,
    seasonComplete: career.currentMatchday >= maxMatchday,
    userMatch: userResult
      ? {
          homeTeamId: userResult.fixture.homeTeamId,
          awayTeamId: userResult.fixture.awayTeamId,
          homeTeamName: teamById.get(userResult.fixture.homeTeamId)?.name,
          awayTeamName: teamById.get(userResult.fixture.awayTeamId)?.name,
          homeGoals: userResult.sim.homeGoals,
          awayGoals: userResult.sim.awayGoals,
          goals: userResult.sim.goals,
        }
      : null,
    otherResults: results
      .filter((r) => !r.fixture.isUserMatch && r.fixture.leagueId === career.leagueId)
      .map((r) => ({
        homeTeamName: teamById.get(r.fixture.homeTeamId)?.name,
        awayTeamName: teamById.get(r.fixture.awayTeamId)?.name,
        homeGoals: r.sim.homeGoals,
        awayGoals: r.sim.awayGoals,
      })),
  };
}

// Computes per-player match stats for the user's XI: starters play 90 (minus a
// chunk if subbed off), bench players who came on play the remaining minutes.
// Only players who featured accrue goals/cards/fitness loss; everyone else in
// the squad is treated as rested (recovers fitness).
function buildUserPlayerStats(
  starters: readonly number[],
  squad: readonly { readonly eaPlayerId: number }[],
  decisions: readonly MatchDecision[],
  userTeamId: number,
  goals: readonly { readonly teamId: number; readonly playerId: number }[],
) {
  const subs = decisions.filter((d) => d.outPlayerId && d.inPlayerId);
  const cameOff = new Map<number, number>(); // playerId -> minute subbed off
  const cameOn = new Map<number, number>(); // playerId -> minute subbed on
  for (const s of subs) {
    cameOff.set(s.outPlayerId!, s.minute);
    cameOn.set(s.inPlayerId!, s.minute);
  }
  const goalsByPlayer = new Map<number, number>();
  for (const g of goals) {
    if (g.teamId === userTeamId) goalsByPlayer.set(g.playerId, (goalsByPlayer.get(g.playerId) ?? 0) + 1);
  }

  const featured = new Set<number>([...starters, ...cameOn.keys()]);
  return squad.map((p) => {
    const id = p.eaPlayerId;
    const started = starters.includes(id);
    let minutesPlayed = 0;
    if (started) minutesPlayed = cameOff.has(id) ? cameOff.get(id)! : FULL_TIME_MINUTE;
    else if (cameOn.has(id)) minutesPlayed = Math.max(1, FULL_TIME_MINUTE - cameOn.get(id)!);
    return {
      playerId: id,
      started,
      minutesPlayed: featured.has(id) ? minutesPlayed : 0,
      goals: goalsByPlayer.get(id) ?? 0,
    };
  });
}

export function registerFootballManagerApiRoutes(app: Express): void {
  // Image proxy — public, cached, and registered before the no-store middleware
  // so <img> tags load without auth and the CDN hotlink-protection is bypassed.
  app.get(`${IMAGE_PROXY_PREFIX}/*splat`, handleImageProxy);

  app.use('/api/football-manager', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // --- Auth ---

  app.get('/api/football-manager/auth/config', (_req: Request, res: Response) => {
    res.json({ googleEnabled: isGoogleAuthConfigured(), devLoginEnabled: isDevLoginAllowed(), clientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? null });
  });

  app.post('/api/football-manager/auth/google', async (req: Request, res: Response) => {
    const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken : '';
    if (!idToken) {
      res.status(400).json({ error: 'missing_id_token' });
      return;
    }
    const profile = await verifyGoogleIdToken(idToken);
    if (!profile) {
      res.status(401).json({ error: 'invalid_google_token' });
      return;
    }
    const user = await upsertUser({ id: profile.sub, email: profile.email, displayName: profile.name, avatarUrl: profile.picture, provider: 'google' });
    setSession(res, user._id);
    res.json({ user: { id: user._id, displayName: user.displayName, email: user.email, avatarUrl: user.avatarUrl } });
  });

  // Dev-mode login: only available when Google is not configured and not in prod.
  app.post('/api/football-manager/auth/dev', async (req: Request, res: Response) => {
    if (!isDevLoginAllowed()) {
      res.status(403).json({ error: 'dev_login_disabled' });
      return;
    }
    const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : 'Dev Manager';
    const id = `dev:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const user = await upsertUser({ id, email: `${id}@dev.local`, displayName: name, provider: 'dev' });
    setSession(res, user._id);
    res.json({ user: { id: user._id, displayName: user.displayName, email: user.email } });
  });

  app.post('/api/football-manager/auth/logout', (_req: Request, res: Response) => {
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    res.status(204).end();
  });

  // --- Everything below requires a session ---
  app.use('/api/football-manager/me', requireAuth);
  app.use('/api/football-manager/leagues', requireAuth);
  app.use('/api/football-manager/career', requireAuth);

  app.get('/api/football-manager/me', async (req: AuthedRequest, res: Response) => {
    const userId = req.userId!;
    const career = await getCareerByUser(userId);
    res.json({
      userId,
      hasCareer: Boolean(career),
      career,
    });
  });

  // League + club catalog for the first-run picker.
  app.get('/api/football-manager/leagues', async (_req: Request, res: Response) => {
    const leagues = await getAllLeagues();
    res.json({ leagues });
  });

  app.get('/api/football-manager/leagues/:leagueId/teams', async (req: Request, res: Response) => {
    const leagueId = Number(req.params.leagueId);
    if (!Number.isFinite(leagueId)) {
      res.status(400).json({ error: 'invalid_league_id' });
      return;
    }
    const teams = await getTeamsByLeague(leagueId);
    res.json({ teams: teams.map(proxyTeam) });
  });

  // Create a career (pick a club).
  app.post('/api/football-manager/career', async (req: AuthedRequest, res: Response) => {
    const clubTeamId = Number(req.body?.clubTeamId);
    if (!Number.isFinite(clubTeamId)) {
      res.status(400).json({ error: 'invalid_club' });
      return;
    }
    const team = await getTeamById(clubTeamId);
    if (!team) {
      res.status(404).json({ error: 'club_not_found' });
      return;
    }
    const career = await createCareer(req.userId!, clubTeamId, team.leagueId);
    await resetCareerTransfers(career._id);
    await resetProgression(career._id);
    await clearLiveMatches(career._id);
    await initClubBudget(career._id, career.seasonNumber, career.currentMatchday, career.clubTeamId);
    res.status(201).json({ career });
  });

  app.get('/api/football-manager/career/squad', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const [team, players, statsMap, lineup] = await Promise.all([
      getTeamById(career.clubTeamId),
      getEffectiveSquad(career._id, career.clubTeamId),
      getStatsMap(career._id),
      getLineup(career._id),
    ]);
    // Enrich each player with this career's progression + availability so the UI
    // can render form/morale/fitness bars and injury/ban badges.
    const enriched = players.map((p) => {
      const stats = statsMap.get(p.eaPlayerId);
      const availability = availabilityAt(stats, career.currentMatchday);
      return {
        ...proxyPlayer(p),
        effectiveOverall: effectiveOverallFor(p, statsMap),
        form: stats?.form ?? 0,
        morale: stats?.morale ?? 70,
        fitness: stats?.fitness ?? 100,
        availability,
        injuredUntilMatchday: stats?.injuredUntilMatchday ?? null,
        suspendedUntilMatchday: stats?.suspendedUntilMatchday ?? null,
        yellowCards: stats?.yellowCards ?? 0,
      };
    });
    // The resolved XI that will actually take the field next matchday.
    const formationId = lineup?.formationId ?? DEFAULT_FORMATION;
    const resolved = resolveMatchdaySquad({ squad: players, statsMap, currentMatchday: career.currentMatchday, savedLineup: lineup?.playerIds ?? [], formationSlots: FORMATIONS[formationId as FormationId]?.slots });
    res.json({
      team: proxyTeam(team),
      players: enriched,
      lineup: lineup?.playerIds ?? [],
      resolvedStarters: resolved.starters,
      currentMatchday: career.currentMatchday,
      formationId,
      formations: FORMATION_IDS.map((id) => ({ id: FORMATIONS[id].id, name: FORMATIONS[id].name, slots: FORMATIONS[id].slots })),
    });
  });

  // Persist the manager's starting XI (reused every matchday until changed or a
  // player becomes unavailable). Validates the players belong to the squad.
  app.post('/api/football-manager/career/lineup', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const raw = Array.isArray(req.body?.playerIds) ? req.body.playerIds : [];
    const playerIds = [...new Set(raw.map((x: unknown) => Number(x)).filter((n: number) => Number.isFinite(n)))] as number[];
    if (playerIds.length > 11) {
      res.status(400).json({ error: 'too_many_players' });
      return;
    }
    const formationId = typeof req.body?.formationId === 'string' && FORMATION_IDS.includes(req.body.formationId) ? (req.body.formationId as string) : undefined;
    const squad = await getEffectiveSquad(career._id, career.clubTeamId);
    const squadIds = new Set(squad.map((p) => p.eaPlayerId));
    if (playerIds.some((id) => !squadIds.has(id))) {
      res.status(400).json({ error: 'player_not_in_squad' });
      return;
    }
    await setLineup(career._id, playerIds, formationId);
    res.json({ lineup: playerIds, formationId: formationId ?? DEFAULT_FORMATION });
  });

  app.get('/api/football-manager/career/table', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const requested = Number(req.query.leagueId);
    const [leagues, allTeams, fixtures] = await Promise.all([getAllLeagues(), getAllTeams(), getAllFixtures(career._id, career.seasonNumber)]);
    const activeLeagueId = leagues.some((l) => l.eaLeagueId === requested) ? requested : career.leagueId;
    const teams = allTeams.filter((t) => t.leagueId === activeLeagueId);
    res.json({
      standings: computeStandings(teams, fixtures).map((row) => ({ ...row, logoUrl: toProxyUrl(row.logoUrl) })),
      leagues: leagues.map((l) => ({ leagueId: l.eaLeagueId, name: l.name })),
      leagueId: activeLeagueId,
    });
  });

  // Full schedule + results for the current season, enriched with team names + crests.
  app.get('/api/football-manager/career/fixtures', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const [fixtures, teams, maxMatchday] = await Promise.all([
      getAllFixtures(career._id, career.seasonNumber),
      getTeamsByLeague(career.leagueId),
      getMaxMatchday(career._id, career.seasonNumber),
    ]);
    const teamById = new Map(teams.map((t) => [t.eaTeamId, t]));
    const enriched = fixtures
      .filter((f) => f.leagueId === career.leagueId)
      .map((f) => ({
      matchday: f.matchday,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      homeTeamName: teamById.get(f.homeTeamId)?.name ?? '',
      awayTeamName: teamById.get(f.awayTeamId)?.name ?? '',
      homeLogoUrl: toProxyUrl(teamById.get(f.homeTeamId)?.logoUrl),
      awayLogoUrl: toProxyUrl(teamById.get(f.awayTeamId)?.logoUrl),
      isUserMatch: f.isUserMatch,
      played: f.played,
      homeGoals: f.homeGoals,
      awayGoals: f.awayGoals,
    }));
    res.json({ fixtures: enriched, currentMatchday: career.currentMatchday, maxMatchday });
  });

  // Golden-boot race for the current season.
  app.get('/api/football-manager/career/scorers', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const [rows, teams] = await Promise.all([aggregateTopScorers(career._id, career.seasonNumber), getTeamsByLeague(career.leagueId)]);
    const teamById = new Map(teams.map((t) => [t.eaTeamId, t]));
    const leagueRows = rows.filter((r) => teamById.has(r.teamId));
    const playerIds = leagueRows.map((r) => r.playerId);
    const players = await Promise.all(playerIds.map((id) => getPlayerById(id)));
    const faceById = new Map(players.filter((p): p is NonNullable<typeof p> => Boolean(p)).map((p) => [p.eaPlayerId, p.faceUrl]));
    res.json({
      scorers: leagueRows.slice(0, 30).map((r) => ({
        playerId: r.playerId,
        playerName: r.playerName,
        teamId: r.teamId,
        teamName: teamById.get(r.teamId)?.name ?? '',
        logoUrl: toProxyUrl(teamById.get(r.teamId)?.logoUrl),
        faceUrl: toProxyUrl(faceById.get(r.playerId)),
        goals: r.goals,
      })),
    });
  });

  // Advance: simulate the whole current matchday, persist, return the user's result.
  app.post('/api/football-manager/career/advance', async (req: AuthedRequest, res: Response) => {
    try {
      const career = await getCareerByUser(req.userId!);
      if (!career) {
        res.status(404).json({ error: 'no_career' });
        return;
      }
      const maxMatchday = await getMaxMatchday(career._id, career.seasonNumber);
      if (career.currentMatchday > maxMatchday) {
        res.status(409).json({ error: 'season_complete' });
        return;
      }

      // Run the AI transfer market for this matchday (expire offers, AI-to-AI
      // deals, incoming bids) while a window is open, before simulating.
      await runAiTransferRound(career);

      // Instant-result path: simulate + commit the whole matchday.
      await clearLiveMatches(career._id);
      const payload = await commitMatchday(career);
      res.json(payload);
    } catch (err) {
      logger.error(`advance failed: ${err}`);
      res.status(500).json({ error: 'advance_failed' });
    }
  });

  // ── Live 2D match ────────────────────────────────────────────────────────
  // Start (or resume) watching the user's current-matchday fixture. Runs the AI
  // transfer round once (same as /advance) and opens a live match; the world is
  // NOT advanced until /match/finish is called.
  app.post('/api/football-manager/career/match/start', async (req: AuthedRequest, res: Response) => {
    try {
      const career = await getCareerByUser(req.userId!);
      if (!career) {
        res.status(404).json({ error: 'no_career' });
        return;
      }
      const maxMatchday = await getMaxMatchday(career._id, career.seasonNumber);
      if (career.currentMatchday > maxMatchday) {
        res.status(409).json({ error: 'season_complete' });
        return;
      }

      const existing = await getLiveMatch(career._id);
      if (existing && existing.matchday === career.currentMatchday) {
        const fixture = { careerId: career._id, leagueId: career.leagueId, seasonNumber: career.seasonNumber, matchday: existing.matchday, homeTeamId: existing.homeTeamId, awayTeamId: existing.awayTeamId, isUserMatch: true } as FixtureDocument;
        const [view, squads] = await Promise.all([buildLiveView(existing, fixture), buildLiveSquads(existing)]);
        res.json({ view, squads });
        return;
      }

      await runAiTransferRound(career);

      const fixtures = await getFixturesForMatchday(career._id, career.seasonNumber, career.currentMatchday);
      const userFixture = fixtures.find((f) => f.isUserMatch);
      if (!userFixture) {
        res.status(404).json({ error: 'no_user_fixture' });
        return;
      }
      const userSide: 'home' | 'away' = userFixture.homeTeamId === career.clubTeamId ? 'home' : 'away';
      const live = await startLiveMatch({
        careerId: career._id,
        seasonNumber: career.seasonNumber,
        matchday: career.currentMatchday,
        homeTeamId: userFixture.homeTeamId,
        awayTeamId: userFixture.awayTeamId,
        userSide,
      });
      const [view, squads] = await Promise.all([buildLiveView(live, userFixture), buildLiveSquads(live)]);
      res.json({ view, squads });
    } catch (err) {
      logger.error(`match/start failed: ${err}`);
      res.status(500).json({ error: 'match_start_failed' });
    }
  });

  // Current live-match state (view + squads).
  app.get('/api/football-manager/career/match/state', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const live = await getLiveMatch(career._id);
    if (!live) {
      res.status(404).json({ error: 'no_live_match' });
      return;
    }
    const fixture = { careerId: career._id, leagueId: career.leagueId, seasonNumber: career.seasonNumber, matchday: live.matchday, homeTeamId: live.homeTeamId, awayTeamId: live.awayTeamId, isUserMatch: true } as FixtureDocument;
    const [view, squads] = await Promise.all([buildLiveView(live, fixture), buildLiveSquads(live)]);
    res.json({ view, squads });
  });

  // Advance the playback cursor by N minutes (default 1).
  app.post('/api/football-manager/career/match/tick', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const live = await getLiveMatch(career._id);
    if (!live) {
      res.status(404).json({ error: 'no_live_match' });
      return;
    }
    const minutes = Number(req.body?.minutes ?? 1);
    const target = req.body?.toEnd ? FULL_TIME_MINUTE : live.minute + (Number.isFinite(minutes) ? minutes : 1);
    await setLiveMatchMinute(career._id, target);
    const updated = await getLiveMatch(career._id);
    const fixture = { careerId: career._id, leagueId: career.leagueId, seasonNumber: career.seasonNumber, matchday: live.matchday, homeTeamId: live.homeTeamId, awayTeamId: live.awayTeamId, isUserMatch: true } as FixtureDocument;
    res.json({ view: await buildLiveView(updated!, fixture) });
  });

  // Change the manager's in-match mentality (applies from the current minute on).
  app.post('/api/football-manager/career/match/tactic', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const live = await getLiveMatch(career._id);
    if (!live) {
      res.status(404).json({ error: 'no_live_match' });
      return;
    }
    const mentality = String(req.body?.mentality ?? '');
    if (mentality !== 'defensive' && mentality !== 'balanced' && mentality !== 'attacking') {
      res.status(400).json({ error: 'invalid_mentality' });
      return;
    }
    await appendLiveMatchDecision(career._id, { minute: live.minute, side: live.userSide, mentality, label: `Mentality: ${mentality}` }, false);
    const updated = await getLiveMatch(career._id);
    const fixture = { careerId: career._id, leagueId: career.leagueId, seasonNumber: career.seasonNumber, matchday: live.matchday, homeTeamId: live.homeTeamId, awayTeamId: live.awayTeamId, isUserMatch: true } as FixtureDocument;
    res.json({ view: await buildLiveView(updated!, fixture) });
  });

  // Make a substitution (bench player on for an on-pitch player). The overall
  // delta shifts the user side's effective strength from the current minute on.
  app.post('/api/football-manager/career/match/sub', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const live = await getLiveMatch(career._id);
    if (!live) {
      res.status(404).json({ error: 'no_live_match' });
      return;
    }
    if (live.subsUsed >= MAX_SUBS_PER_MATCH) {
      res.status(409).json({ error: 'no_subs_left' });
      return;
    }
    const outPlayerId = Number(req.body?.outPlayerId);
    const inPlayerId = Number(req.body?.inPlayerId);
    const squads = await buildLiveSquads(live);
    const starter = squads.onPitch.find((p) => p.playerId === outPlayerId);
    const bench = squads.bench.find((p) => p.playerId === inPlayerId);
    if (!starter || !bench) {
      res.status(400).json({ error: 'invalid_players' });
      return;
    }
    const overallDelta = bench.overall - starter.overall;
    await appendLiveMatchDecision(
      career._id,
      { minute: live.minute, side: live.userSide, overallDelta, outPlayerId, inPlayerId, label: `Sub: ${bench.name} on for ${starter.name}` },
      true,
    );
    const updated = await getLiveMatch(career._id);
    const fixture = { careerId: career._id, leagueId: career.leagueId, seasonNumber: career.seasonNumber, matchday: live.matchday, homeTeamId: live.homeTeamId, awayTeamId: live.awayTeamId, isUserMatch: true } as FixtureDocument;
    const [view, updatedSquads] = await Promise.all([buildLiveView(updated!, fixture), buildLiveSquads(updated!)]);
    res.json({ view, squads: updatedSquads });
  });

  // Commit the whole matchday using the manager's decisions for the user fixture,
  // then advance the career. Returns the same payload shape as /advance.
  app.post('/api/football-manager/career/match/finish', async (req: AuthedRequest, res: Response) => {
    try {
      const career = await getCareerByUser(req.userId!);
      if (!career) {
        res.status(404).json({ error: 'no_career' });
        return;
      }
      const live = await getLiveMatch(career._id);
      if (!live) {
        res.status(404).json({ error: 'no_live_match' });
        return;
      }
      const decisions: MatchDecision[] = live.decisions.map((d) => ({ minute: d.minute, side: d.side, mentality: d.mentality, overallDelta: d.overallDelta, outPlayerId: d.outPlayerId, inPlayerId: d.inPlayerId }));
      const payload = await commitMatchday(career, decisions);
      await finishLiveMatch(career._id);
      res.json(payload);
    } catch (err) {
      logger.error(`match/finish failed: ${err}`);
      res.status(500).json({ error: 'match_finish_failed' });
    }
  });

  // Season summary for the just-finished season (used by the season-complete screen).
  app.get('/api/football-manager/career/season-summary', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const summary = await buildSeasonSummary(career._id, career.seasonNumber, career.leagueId, career.clubTeamId);
    res.json(summary);
  });

  // Roll over to a new season: archive the finished one, regenerate the schedule.
  app.post('/api/football-manager/career/new-season', async (req: AuthedRequest, res: Response) => {
    try {
      const career = await getCareerByUser(req.userId!);
      if (!career) {
        res.status(404).json({ error: 'no_career' });
        return;
      }
      const maxMatchday = await getMaxMatchday(career._id, career.seasonNumber);
      if (career.currentMatchday <= maxMatchday) {
        res.status(409).json({ error: 'season_in_progress' });
        return;
      }

      const summary = await buildSeasonSummary(career._id, career.seasonNumber, career.leagueId, career.clubTeamId);
      const archive = {
        careerId: career._id,
        seasonNumber: career.seasonNumber,
        leagueId: career.leagueId,
        clubTeamId: career.clubTeamId,
        clubPosition: summary.clubPosition,
        champion: summary.champion,
        topScorer: summary.topScorer ? { playerId: summary.topScorer.playerId, playerName: summary.topScorer.playerName, goals: summary.topScorer.goals } : null,
        standings: summary.standings,
        archivedAt: new Date(),
      };
      const updated = await startNewSeason(career, archive);
      await clearTransferState(career._id, career.seasonNumber);
      await clearLiveMatches(career._id);
      await initClubBudget(updated._id, updated.seasonNumber, updated.currentMatchday, updated.clubTeamId);

      // Age every player across all five leagues (toward/away from potential)
      // and reset season-scoped fitness/morale/cards for the new campaign.
      const leagueTeams = await getAllTeams();
      const squads = await getEffectiveSquads(updated._id, leagueTeams.map((t) => t.eaTeamId));
      const allPlayers = [...squads.values()].flat();
      await applySeasonAging({ careerId: updated._id, newSeasonNumber: updated.seasonNumber, players: allPlayers, seedPrefix: `${updated._id}:${updated.seasonNumber}:aging` });

      res.json({ career: updated });
    } catch (err) {
      logger.error(`new-season failed: ${err}`);
      res.status(500).json({ error: 'new_season_failed' });
    }
  });

  // --- Phase 3: Transfers ---

  // Transfer market search (excludes the user's own squad; overlay-aware).
  // Searches ALL leagues by default so managers can buy cross-league; pass
  // ?leagueId= to scope to one league. Results are always sorted by value
  // (cheapest first). Potential is always visible (scouting is free).
  app.get('/api/football-manager/career/market', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    const name = typeof req.query.name === 'string' ? req.query.name : undefined;
    const position = typeof req.query.position === 'string' ? req.query.position : undefined;
    const leagueId = req.query.leagueId ? Number(req.query.leagueId) : undefined;
    const maxValue = req.query.maxValue ? Number(req.query.maxValue) : undefined;
    const minOverall = req.query.minOverall ? Number(req.query.minOverall) : undefined;

    const [rows, teams] = await Promise.all([
      searchMarket({ careerId: career._id, name, position, leagueId, maxValue, minOverall, excludeTeamId: career.clubTeamId, limit: 50 }),
      getAllTeams(),
    ]);
    const teamById = new Map(teams.map((t) => [t.eaTeamId, t]));
    res.json({
      players: rows.map(({ player, effectiveTeamId }) => ({
        playerId: player.eaPlayerId,
        name: player.shortName,
        positions: player.positions,
        overall: player.overall,
        potential: player.potential,
        age: player.age,
        value: player.valueEur,
        teamId: effectiveTeamId,
        teamName: teamById.get(effectiveTeamId)?.name ?? '',
        logoUrl: toProxyUrl(teamById.get(effectiveTeamId)?.logoUrl),
        faceUrl: toProxyUrl(player.faceUrl),
      })),
    });
  });

  // Transfers dashboard: budget, window state, outgoing bids, incoming offers, news.
  app.get('/api/football-manager/career/transfers', async (req: AuthedRequest, res: Response) => {
    const career = await getCareerByUser(req.userId!);
    if (!career) {
      res.status(404).json({ error: 'no_career' });
      return;
    }
    await expireStaleOffers(career._id, career.currentMatchday);
    const [careerTeam, bids, offers, news, teams] = await Promise.all([
      getCareerTeam(career._id, career.clubTeamId),
      getActiveBids(career._id, career.seasonNumber),
      getPendingOffers(career._id, career.seasonNumber),
      getTransferNews(career._id, career.seasonNumber),
      getAllTeams(),
    ]);
    const teamById = new Map(teams.map((t) => [t.eaTeamId, t]));
    const nameOf = (id: number) => teamById.get(id)?.name ?? '';
    // Enrich incoming offers with the offered player's face / overall / positions.
    const offerPlayers = await Promise.all(offers.map((o) => getPlayerById(o.playerId)));
    const offerPlayerById = new Map(offerPlayers.filter((p): p is NonNullable<typeof p> => Boolean(p)).map((p) => [p.eaPlayerId, p]));
    const window = openWindowForMatchday(career.currentMatchday);
    res.json({
      budget: careerTeam?.budget ?? 0,
      signingsThisWindow: careerTeam?.signingsThisWindow ?? 0,
      window: window ? window.name : null,
      windowOpen: Boolean(window),
      bids: bids.map((b) => ({ id: String(b._id), playerId: b.playerId, playerName: b.playerName, teamName: nameOf(b.fromTeamId), amount: b.amount, status: b.status, counterAmount: b.counterAmount })),
      offers: offers.map((o) => {
        const p = offerPlayerById.get(o.playerId);
        return {
          id: String(o._id),
          playerId: o.playerId,
          playerName: o.playerName,
          fromTeamName: nameOf(o.fromTeamId),
          amount: o.amount,
          expiresMatchday: o.expiresMatchday,
          faceUrl: toProxyUrl(p?.faceUrl),
          overall: p?.overall ?? null,
          positions: p?.positions ?? [],
        };
      }),
      news: news.map((n) => ({ playerName: n.playerName, fromTeamName: n.fromTeamName, toTeamName: n.toTeamName, amount: n.amount, matchday: n.matchday })),
    });
  });

  // Place a bid for a player (user -> AI). AI responds immediately (accept/reject/counter).
  app.post('/api/football-manager/career/bid', async (req: AuthedRequest, res: Response) => {
    try {
      const career = await getCareerByUser(req.userId!);
      if (!career) {
        res.status(404).json({ error: 'no_career' });
        return;
      }
      if (!openWindowForMatchday(career.currentMatchday)) {
        res.status(409).json({ error: 'window_closed' });
        return;
      }
      const playerId = Number(req.body?.playerId);
      const amount = Number(req.body?.amount);
      if (!Number.isFinite(playerId) || !Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ error: 'invalid_bid' });
        return;
      }
      const player = await getPlayerById(playerId);
      if (!player) {
        res.status(404).json({ error: 'player_not_found' });
        return;
      }
      const sellerId = await getEffectiveTeamId(career._id, player);
      if (sellerId === career.clubTeamId) {
        res.status(400).json({ error: 'already_yours' });
        return;
      }

      const [buyerTeam, sellerSquad, teams] = await Promise.all([
        getCareerTeam(career._id, career.clubTeamId),
        getEffectiveSquad(career._id, sellerId),
        getAllTeams(),
      ]);
      if (!buyerTeam || !canSign(buyerTeam.signingsThisWindow)) {
        res.status(409).json({ error: 'signing_cap_reached' });
        return;
      }
      if (!canAfford(buyerTeam.budget, amount)) {
        res.status(409).json({ error: 'insufficient_budget' });
        return;
      }

      const teamById = new Map(teams.map((t) => [t.eaTeamId, t]));
      const decision = decideOnBid({ bidAmount: amount, playerValue: player.valueEur, sellerSquadSize: sellerSquad.length });

      if (decision.outcome === 'accept') {
        await executeTransfer({
          careerId: career._id,
          seasonNumber: career.seasonNumber,
          matchday: career.currentMatchday,
          player,
          fromTeamId: sellerId,
          fromTeamName: teamById.get(sellerId)?.name ?? '',
          toTeamId: career.clubTeamId,
          toTeamName: teamById.get(career.clubTeamId)?.name ?? '',
          amount,
        });
        res.json({ outcome: 'accept' });
        return;
      }

      const bid = await createBid({
        careerId: career._id,
        seasonNumber: career.seasonNumber,
        playerId,
        playerName: player.shortName,
        fromTeamId: sellerId,
        toTeamId: career.clubTeamId,
        amount,
        status: decision.outcome === 'counter' ? 'countered' : 'rejected',
        counterAmount: decision.outcome === 'counter' ? decision.counterAmount ?? null : null,
        resolvedAt: decision.outcome === 'counter' ? null : new Date(),
      });
      res.json({ outcome: decision.outcome, counterAmount: decision.counterAmount ?? null, bidId: String(bid._id) });
    } catch (err) {
      logger.error(`bid failed: ${err}`);
      res.status(500).json({ error: 'bid_failed' });
    }
  });

  // Respond to an AI counter on one of your bids: accept the counter or withdraw.
  app.post('/api/football-manager/career/bid/:id/respond', async (req: AuthedRequest, res: Response) => {
    try {
      const career = await getCareerByUser(req.userId!);
      if (!career) {
        res.status(404).json({ error: 'no_career' });
        return;
      }
      const accept = req.body?.accept === true;
      const bid = await getBidById(career._id, String(req.params.id));
      if (!bid || bid.status !== 'countered' || bid.counterAmount == null) {
        res.status(404).json({ error: 'bid_not_actionable' });
        return;
      }
      if (!accept) {
        await updateBidStatus(bid._id!, { status: 'withdrawn' });
        res.json({ outcome: 'withdrawn' });
        return;
      }
      if (!openWindowForMatchday(career.currentMatchday)) {
        res.status(409).json({ error: 'window_closed' });
        return;
      }
      const [player, buyerTeam, teams] = await Promise.all([getPlayerById(bid.playerId), getCareerTeam(career._id, career.clubTeamId), getAllTeams()]);
      if (!player) {
        res.status(404).json({ error: 'player_not_found' });
        return;
      }
      if (!buyerTeam || !canSign(buyerTeam.signingsThisWindow) || !canAfford(buyerTeam.budget, bid.counterAmount)) {
        res.status(409).json({ error: 'cannot_complete' });
        return;
      }
      const teamById = new Map(teams.map((t) => [t.eaTeamId, t]));
      await executeTransfer({
        careerId: career._id,
        seasonNumber: career.seasonNumber,
        matchday: career.currentMatchday,
        player,
        fromTeamId: bid.fromTeamId,
        fromTeamName: teamById.get(bid.fromTeamId)?.name ?? '',
        toTeamId: career.clubTeamId,
        toTeamName: teamById.get(career.clubTeamId)?.name ?? '',
        amount: bid.counterAmount,
      });
      await updateBidStatus(bid._id!, { status: 'accepted' });
      res.json({ outcome: 'accepted' });
    } catch (err) {
      logger.error(`bid respond failed: ${err}`);
      res.status(500).json({ error: 'bid_respond_failed' });
    }
  });

  // Respond to an incoming AI offer for one of your players: accept (sell) or reject.
  app.post('/api/football-manager/career/offer/:id/respond', async (req: AuthedRequest, res: Response) => {
    try {
      const career = await getCareerByUser(req.userId!);
      if (!career) {
        res.status(404).json({ error: 'no_career' });
        return;
      }
      const accept = req.body?.accept === true;
      const offer = await getOfferById(career._id, String(req.params.id));
      if (!offer || offer.status !== 'pending') {
        res.status(404).json({ error: 'offer_not_actionable' });
        return;
      }
      if (offer.expiresMatchday < career.currentMatchday) {
        await updateOfferStatus(offer._id!, 'expired');
        res.status(409).json({ error: 'offer_expired' });
        return;
      }
      if (!accept) {
        await updateOfferStatus(offer._id!, 'rejected');
        res.json({ outcome: 'rejected' });
        return;
      }
      const [player, teams] = await Promise.all([getPlayerById(offer.playerId), getAllTeams()]);
      if (!player) {
        res.status(404).json({ error: 'player_not_found' });
        return;
      }
      const teamById = new Map(teams.map((t) => [t.eaTeamId, t]));
      await executeTransfer({
        careerId: career._id,
        seasonNumber: career.seasonNumber,
        matchday: career.currentMatchday,
        player,
        fromTeamId: career.clubTeamId,
        fromTeamName: teamById.get(career.clubTeamId)?.name ?? '',
        toTeamId: offer.fromTeamId,
        toTeamName: teamById.get(offer.fromTeamId)?.name ?? '',
        amount: offer.amount,
      });
      await updateOfferStatus(offer._id!, 'accepted');
      res.json({ outcome: 'accepted' });
    } catch (err) {
      logger.error(`offer respond failed: ${err}`);
      res.status(500).json({ error: 'offer_respond_failed' });
    }
  });

  logger.log('Football Manager API routes registered at /api/football-manager/*');
}
