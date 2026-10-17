import type { Express, Request, Response } from 'express';
import express from 'express';
import { getErrorMessage, Logger } from '@core/utils';
import { coachAuthMiddleware, getCoachUser } from './auth.middleware';
import type { CoachDashboardService } from './dashboard.service';
import { parsePreferencesBody } from './dto';
import type { ApiError, CompetitionOption, DashboardPreferencesDto, DashboardResponse, TeamOption } from './types';

const logger = new Logger('coach:api');

export function registerCoachApiRoutes(app: Express, dashboardService: CoachDashboardService): void {
  app.use('/api/coach', express.json({ limit: '64kb' }));
  app.use('/api/coach', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/coach', coachAuthMiddleware);

  app.get('/api/coach/dashboard', async (req: Request, res: Response<DashboardResponse | ApiError>) => {
    const user = getCoachUser(req);
    try {
      res.json(await dashboardService.getDashboard(user.telegramUserId));
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

  app.get('/api/coach/competitions', async (_req: Request, res: Response<CompetitionOption[] | ApiError>) => {
    try {
      res.json(await dashboardService.getCompetitionOptions());
    } catch (err) {
      logger.error(`Failed to load competitions: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'competitions_failed' });
    }
  });

  app.get('/api/coach/teams/search', async (req: Request, res: Response<TeamOption[] | ApiError>) => {
    const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 50) : '';
    try {
      res.json(await dashboardService.searchTeams(query));
    } catch (err) {
      logger.error(`Team search failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'search_failed' });
    }
  });
}
