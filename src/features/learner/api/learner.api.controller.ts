import type { Express, Request, Response } from 'express';
import express from 'express';
import { getErrorMessage, Logger } from '@core/utils';
import { getProgress, mergeSync } from '../mongo';
import { getRequestUser, learnerAuthMiddleware } from './auth.middleware';
import { type LearnerApiError, type LearnerProgressResponse, parseSyncBody, toProgressDto } from './dto';

const logger = new Logger('learner:api');

export function registerLearnerApiRoutes(app: Express): void {
  app.use('/api/learner', express.json({ limit: '512kb' }));
  app.use('/api/learner', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use('/api/learner/progress', learnerAuthMiddleware);

  app.get('/api/learner/progress', async (req: Request, res: Response<LearnerProgressResponse | LearnerApiError>) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    try {
      const doc = await getProgress(user.telegramUserId);
      res.json({ progress: toProgressDto(doc) });
    } catch (err) {
      logger.error(`Failed to load progress ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'progress_load_failed' });
    }
  });

  app.post('/api/learner/progress/sync', async (req: Request, res: Response<LearnerProgressResponse | LearnerApiError>) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    const body = parseSyncBody(req.body);
    if (!body) {
      res.status(400).json({ error: 'invalid_progress' });
      return;
    }
    try {
      const doc = await mergeSync(user.telegramUserId, body);
      res.json({ progress: toProgressDto(doc) });
    } catch (err) {
      logger.error(`Failed to sync progress ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'progress_sync_failed' });
    }
  });
}
