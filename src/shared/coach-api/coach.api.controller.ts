import type { Express, Request, Response } from 'express';
import { getDateString, Logger } from '@core/utils';
import { COMPETITION_IDS_MAP } from '@services/scores-365';
import { addSubscription, getSubscription, updateSubscription } from '@shared/coach';
import { getSportsCompetitionMatches, getSportsCompetitionTable, getSportsCompetitions, getSportsMatchesSummary } from '@shared/sports';
import { coachAuthMiddleware } from './auth.middleware';
import type { CompetitionDetailResponse, CompetitionsListResponse, FollowUpdateBody, FollowUpdateResponse, MatchDetailResponse, MatchSummary, TodayResponse } from './dto';
import { fetchRichMatch } from './match-fetcher';
import { toCompetitionRef, toMatchSummary, toTableRows } from './transformers';

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

export function registerCoachApiRoutes(app: Express): void {
  app.use('/api/coach', coachAuthMiddleware);

  app.get('/api/coach/today', async (req: Request, res: Response<TodayResponse | { error: string }>) => {
    const { chatId } = req.coachUser!;
    const date = getDateString();
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
      const matches = group.matches.map((m) => toMatchSummary(m, group.competition.id));
      for (const match of matches) if (match.status === 'live') live.push(match);
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
    const [tableDetails, matchesDetails, competitions] = await Promise.all([getSportsCompetitionTable(id), getSportsCompetitionMatches(id), getSportsCompetitions()]);
    const compMeta = competitions?.find((c) => c.id === id);
    if (!compMeta) {
      res.status(404).json({ error: 'competition_not_found' });
      return;
    }
    res.json({
      competition: toCompetitionRef(compMeta),
      table: tableDetails ? toTableRows(tableDetails.competitionTable) : [],
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
    res.json({
      match: rich.summary,
      ...(rich.venue ? { venue: rich.venue } : {}),
      ...(rich.stage ? { stage: rich.stage } : {}),
      ...(rich.channel ? { channel: rich.channel } : {}),
      ...(rich.round ? { round: rich.round } : {}),
      events: rich.events,
      ...(rich.homeLineup ? { homeLineup: rich.homeLineup } : {}),
      ...(rich.awayLineup ? { awayLineup: rich.awayLineup } : {}),
    });
  });

  logger.log('Coach API routes registered at /api/coach/*');
}
