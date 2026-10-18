import type { Express, Request, Response } from 'express';
import express from 'express';
import { getErrorMessage, Logger } from '@core/utils';
import { coachAuthMiddleware, getCoachUser } from './auth.middleware';
import { DEFAULT_LANGUAGE } from './constants';
import type { CoachDashboardService } from './dashboard.service';
import type { CoachDetailsService } from './details.service';
import { parseLanguage, parsePreferencesBody } from './dto';
import type { ApiError, CompetitionOption, DashboardPreferencesDto, DashboardResponse, TeamOption } from './types';

const logger = new Logger('coach:api');

function requestLanguage(req: Request) {
  return parseLanguage(req.query.lang);
}

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Wraps a GET-by-id detail route: validates the id, maps null to 404 and errors to 500.
function detailRoute<T>(name: string, load: (id: number, req: Request) => Promise<T | null>) {
  return async (req: Request, res: Response<T | ApiError>) => {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'invalid_id' });
      return;
    }
    try {
      const result = await load(id, req);
      if (result) res.json(result);
      else res.status(404).json({ error: `${name}_not_found` });
    } catch (err) {
      logger.error(`Failed to load ${name} ${id}: ${getErrorMessage(err)}`);
      res.status(502).json({ error: `${name}_failed` });
    }
  };
}

export function registerCoachApiRoutes(app: Express, dashboardService: CoachDashboardService, detailsService: CoachDetailsService): void {
  app.use('/api/coach', express.json({ limit: '64kb' }));
  app.use('/api/coach', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/coach', coachAuthMiddleware);

  app.get('/api/coach/dashboard', async (req: Request, res: Response<DashboardResponse | ApiError>) => {
    const user = getCoachUser(req);
    try {
      res.json(await dashboardService.getDashboard(user.telegramUserId, requestLanguage(req)));
    } catch (err) {
      logger.error(`Failed to build dashboard for ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'dashboard_failed' });
    }
  });

  app.get('/api/coach/preferences', async (req: Request, res: Response<DashboardPreferencesDto | ApiError>) => {
    const user = getCoachUser(req);
    try {
      res.json(await dashboardService.getPreferences(user.telegramUserId));
    } catch (err) {
      logger.error(`Failed to load preferences for ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'preferences_load_failed' });
    }
  });

  app.put('/api/coach/preferences', async (req: Request, res: Response<DashboardPreferencesDto | ApiError>) => {
    const user = getCoachUser(req);
    const update = parsePreferencesBody(req.body);
    if (!update) {
      res.status(400).json({ error: 'invalid_preferences' });
      return;
    }
    try {
      res.json(await dashboardService.savePreferences(user.telegramUserId, update));
    } catch (err) {
      logger.error(`Failed to save preferences for ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'preferences_save_failed' });
    }
  });

  app.get('/api/coach/competitions', async (req: Request, res: Response<CompetitionOption[] | ApiError>) => {
    try {
      res.json(await dashboardService.getCompetitionOptions(requestLanguage(req) ?? DEFAULT_LANGUAGE));
    } catch (err) {
      logger.error(`Failed to load competitions: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'competitions_failed' });
    }
  });

  app.get('/api/coach/competitions/favorite-counts', async (req: Request, res: Response<Record<number, number> | ApiError>) => {
    const user = getCoachUser(req);
    try {
      res.json(await dashboardService.getFavoriteTeamCounts(user.telegramUserId));
    } catch (err) {
      logger.error(`Failed to count favorite teams for ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'favorite_counts_failed' });
    }
  });

  app.get('/api/coach/teams/search', async (req: Request, res: Response<TeamOption[] | ApiError>) => {
    const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 50) : '';
    try {
      res.json(await dashboardService.searchTeams(query, requestLanguage(req) ?? DEFAULT_LANGUAGE));
    } catch (err) {
      logger.error(`Team search failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'search_failed' });
    }
  });

  app.get(
    '/api/coach/games/:id',
    detailRoute('game', (id, req) => detailsService.getGame(getCoachUser(req).telegramUserId, id, requestLanguage(req) ?? DEFAULT_LANGUAGE)),
  );
  app.get(
    '/api/coach/teams/:id',
    detailRoute('team', (id, req) => detailsService.getTeam(id, requestLanguage(req) ?? DEFAULT_LANGUAGE)),
  );
  app.get(
    '/api/coach/players/:id',
    detailRoute('player', (id, req) => detailsService.getPlayer(id, requestLanguage(req) ?? DEFAULT_LANGUAGE)),
  );
  app.get(
    '/api/coach/competitions/:id',
    detailRoute('competition', (id, req) => detailsService.getCompetition(id, requestLanguage(req) ?? DEFAULT_LANGUAGE)),
  );
}
