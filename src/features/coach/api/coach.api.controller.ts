import type { Express, Request, Response } from 'express';
import { getDateString, Logger } from '@core/utils';
import { COMPETITION_IDS_MAP } from '@services/scores-365';
import { notify } from '@services/notifier';
import type { TelegramBotConfig } from '@services/telegram';
import { addSubscription, getSubscription, updateSubscription } from '@shared/coach';
import { getSportsCompetitionMatches, getSportsCompetitions, getSportsMatchesSummary } from '@shared/sports';
import { coachAuthMiddleware } from './auth.middleware';
import type { AthleteDetailResponse, CompetitionDetailResponse, CompetitionsListResponse, FollowUpdateBody, FollowUpdateResponse, MatchDetailResponse, MatchSummary, TeamDetailResponse, TodayResponse } from './dto';
import { fetchAthleteDetail } from './athlete-fetcher';
import { fetchCompetitionStandingsAndBrackets } from './competition-fetcher';
import { fetchRichMatch } from './match-fetcher';
import { fetchTeamDetail, fetchTeamRecentMatches } from './team-fetcher';
import { toCompetitionRef, toMatchSummary } from './transformers';

const logger = new Logger('CoachApiController');

const ALL_LEAGUE_IDS = Object.values(COMPETITION_IDS_MAP);

function isFollowing(leagueId: number, customLeagues: number[] | undefined): boolean {
  if (!customLeagues || customLeagues.length === 0) return true;
  return customLeagues.includes(leagueId);
}

async function ensureSubscription(chatId: number) {
  const existing = await getSubscription(chatId);
  if (existing) return existing;
  await addSubscription(chatId);
  return await getSubscription(chatId);
}

export type CoachApiDeps = {
  readonly botConfig: TelegramBotConfig;
};

function userDetailsFromReq(req: Request) {
  const { telegramUserId, chatId, username } = req.coachUser!;
  return { telegramUserId, chatId, username: username ?? '', firstName: '', lastName: '' };
}

export function registerCoachApiRoutes(app: Express, deps: CoachApiDeps): void {
  const { botConfig } = deps;

  app.use('/api/coach', coachAuthMiddleware);

  app.get('/api/coach/today', async (req: Request, res: Response<TodayResponse | { error: string }>) => {
    const { chatId } = req.coachUser!;
    const requested = typeof req.query.date === 'string' ? req.query.date : '';
    const isValid = /^\d{4}-\d{2}-\d{2}$/.test(requested);
    const date = isValid ? requested : getDateString();
    const [summaryDetails, subscription] = await Promise.all([getSportsMatchesSummary(date), getSubscription(chatId)]);
    if (!summaryDetails) {
      res.json({ date, live: [], groups: [] });
      return;
    }
    const customLeagues = subscription?.customLeagues ?? [];
    const filtered = customLeagues.length === 0 ? summaryDetails : summaryDetails.filter((s) => customLeagues.includes(s.competition.id));

    const live: MatchSummary[] = [];
    const groups = filtered.map((group) => {
      const competition = toCompetitionRef(group.competition);
      const allMatches = group.matches.map((m) => toMatchSummary(m, group.competition.id));
      for (const match of allMatches) if (match.status === 'live') live.push(match);
      const matches = allMatches.filter((match) => match.status !== 'live');
      return { competition, matches };
    });

    res.json({ date, live, groups });
  });

  app.get('/api/coach/competitions', async (req: Request, res: Response<CompetitionsListResponse | { error: string }>) => {
    const { chatId } = req.coachUser!;
    const [competitions, subscription] = await Promise.all([getSportsCompetitions(), getSubscription(chatId)]);
    if (!competitions) {
      res.json({ competitions: [] });
      return;
    }
    const customLeagues = subscription?.customLeagues;
    res.json({
      competitions: competitions.map((c) => ({
        ...toCompetitionRef(c),
        hasTable: Boolean(c.hasTable),
        following: isFollowing(c.id, customLeagues),
      })),
    });
  });

  app.post('/api/coach/competitions/:id/follow', async (req: Request, res: Response<FollowUpdateResponse | { error: string }>) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const body = req.body as FollowUpdateBody | undefined;
    if (!body || typeof body.follow !== 'boolean') {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const { chatId } = req.coachUser!;
    const userDetails = userDetailsFromReq(req);
    try {
      const sub = await ensureSubscription(chatId);
      const current = sub?.customLeagues ?? [];
      let next: number[];
      if (body.follow) {
        next = current.length === 0 ? [] : current.includes(id) ? current : [...current, id];
      } else {
        const seed = current.length === 0 ? ALL_LEAGUE_IDS : current;
        next = seed.filter((x) => x !== id);
      }
      await updateSubscription(chatId, { customLeagues: [...new Set(next)] });
      notify(botConfig, { action: 'FOLLOW_LEAGUE', competitionId: id, follow: body.follow, source: 'mini_app' }, userDetails);
      res.json({ following: isFollowing(id, next) });
    } catch (err) {
      logger.error(`follow toggle failed for chatId=${chatId} id=${id}: ${err}`);
      res.status(500).json({ error: 'update_failed' });
    }
  });

  app.get('/api/coach/competitions/:id', async (req: Request, res: Response<CompetitionDetailResponse | { error: string }>) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const [standingsAndBrackets, matchesDetails, competitions] = await Promise.all([
      fetchCompetitionStandingsAndBrackets(id),
      getSportsCompetitionMatches(id),
      getSportsCompetitions(),
    ]);
    const compMeta = competitions?.find((c) => c.id === id);
    if (!compMeta) {
      res.status(404).json({ error: 'competition_not_found' });
      return;
    }
    res.json({
      competition: toCompetitionRef(compMeta),
      tables: standingsAndBrackets.tables,
      knockoutStages: standingsAndBrackets.knockoutStages,
      fixtures: matchesDetails ? matchesDetails.matches.map((m) => toMatchSummary(m, id)) : [],
    });
  });

  app.get('/api/coach/matches/:id', async (req: Request, res: Response<MatchDetailResponse | { error: string }>) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const rich = await fetchRichMatch(id);
    if (!rich) {
      res.status(404).json({ error: 'match_not_found' });
      return;
    }
    const [homeRecentMatches, awayRecentMatches] = await Promise.all([
      fetchTeamRecentMatches(rich.summary.home.id),
      fetchTeamRecentMatches(rich.summary.away.id),
    ]);
    res.json({
      match: rich.summary,
      ...(rich.venue ? { venue: rich.venue } : {}),
      ...(rich.stage ? { stage: rich.stage } : {}),
      ...(rich.channel ? { channel: rich.channel } : {}),
      ...(rich.round ? { round: rich.round } : {}),
      events: rich.events,
      ...(rich.homeLineup ? { homeLineup: rich.homeLineup } : {}),
      ...(rich.awayLineup ? { awayLineup: rich.awayLineup } : {}),
      ...(homeRecentMatches.length ? { homeRecentMatches } : {}),
      ...(awayRecentMatches.length ? { awayRecentMatches } : {}),
    });
  });

  app.get('/api/coach/teams/:id', async (req: Request, res: Response<TeamDetailResponse | { error: string }>) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const team = await fetchTeamDetail(id);
    if (!team) {
      res.status(404).json({ error: 'team_not_found' });
      return;
    }
    res.json(team);
  });

  app.get('/api/coach/athletes/:id', async (req: Request, res: Response<AthleteDetailResponse | { error: string }>) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    const athlete = await fetchAthleteDetail(id);
    if (!athlete) {
      res.status(404).json({ error: 'athlete_not_found' });
      return;
    }
    res.json(athlete);
  });

  app.post('/api/coach/open', async (req: Request, res: Response) => {
    const userDetails = userDetailsFromReq(req);
    notify(botConfig, { action: 'OPEN_APP', source: 'mini_app' }, userDetails);
    res.status(204).end();
  });

  logger.log('Coach API routes registered at /api/coach/*');
}
