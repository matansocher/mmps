import express from 'express';
import type { Express } from 'express';
import { createMongoConnection } from '@core/mongo';
import { getErrorMessage, Logger } from '@core/utils';
import { CAMPAIGN_VERSION, parseSyncRequest } from '@shared/rewind';
import { getProgress, resetProgress, REWIND_DB_NAME, syncProgress } from '../mongo';
import { getRewindUserId, rewindAuthMiddleware } from './auth.middleware';

const logger = new Logger('rewind:api');

export function registerRewindApiRoutes(app: Express): void {
  const router = express.Router();
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.use(express.json({ limit: '64kb' }), rewindAuthMiddleware);
  router.use(async (req, res, next) => {
    if (!Number.isSafeInteger(getRewindUserId(req)) || getRewindUserId(req)! < 1) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    try {
      await createMongoConnection(REWIND_DB_NAME);
      next();
    } catch (error) {
      logger.error(`Progress connection failed: ${getErrorMessage(error)}`);
      res.status(503).json({ error: 'progress_unavailable' });
    }
  });
  router.get('/progress', async (req, res) => {
    try {
      res.json({ journey: await getProgress(getRewindUserId(req)!) });
    } catch (error) {
      logger.error(`Progress read failed: ${getErrorMessage(error)}`);
      res.status(503).json({ error: 'progress_unavailable' });
    }
  });
  router.post('/progress/sync', async (req, res) => {
    let request: ReturnType<typeof parseSyncRequest>;
    try {
      request = parseSyncRequest(req.body);
    } catch {
      res.status(400).json({ error: 'invalid_progress' });
      return;
    }
    try {
      res.json(await syncProgress(getRewindUserId(req)!, request));
    } catch (error) {
      logger.error(`Progress sync failed: ${getErrorMessage(error)}`);
      res.status(503).json({ error: 'progress_unavailable' });
    }
  });
  router.post('/progress/reset', async (req, res) => {
    const epoch: unknown = req.body?.epoch;
    if (req.body?.campaignVersion !== CAMPAIGN_VERSION || typeof epoch !== 'number' || !Number.isSafeInteger(epoch) || epoch < 0) {
      res.status(400).json({ error: 'invalid_epoch' });
      return;
    }
    try {
      const journey = await resetProgress(getRewindUserId(req)!, epoch);
      if (!journey) res.status(409).json({ error: 'journey_changed' });
      else res.json({ journey });
    } catch (error) {
      logger.error(`Progress reset failed: ${getErrorMessage(error)}`);
      res.status(503).json({ error: 'progress_unavailable' });
    }
  });
  app.use('/api/rewind', router);
}
