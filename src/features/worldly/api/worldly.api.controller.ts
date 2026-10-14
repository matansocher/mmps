import type { Express, Request, Response } from 'express';
import express from 'express';
import { getErrorMessage, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import type { UserDetails } from '@services/telegram';
import type { GlobeProgressDocument, GlobeProgressSnapshot } from '@shared/worldly';
import { mergeGlobeProgressSync } from '../mongo';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from '../worldly.config';
import { getRequestUser, worldlyAuthMiddleware, type WorldlyAuthUser } from './auth.middleware';
import { type GlobeEvent, parseGlobeEvent, parseGlobeSnapshot } from './dto';

const logger = new Logger('WorldlyApi');

function toSnapshot(doc: GlobeProgressDocument): GlobeProgressSnapshot {
  return { progress: doc.progress, bestScores: doc.bestScores };
}

function toUserDetails(user: WorldlyAuthUser): UserDetails {
  return {
    chatId: user.telegramUserId,
    telegramUserId: user.telegramUserId,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    username: user.username ?? '',
  };
}

function toNotifyData(event: GlobeEvent): { readonly action: string; readonly [key: string]: string } {
  switch (event.event) {
    case 'opened':
      return { action: ANALYTIC_EVENT_NAMES.GLOBE_OPENED };
    case 'round_started':
      return { action: ANALYTIC_EVENT_NAMES.GLOBE_ROUND_STARTED, game: '🌍', mode: event.mode };
    case 'round_finished':
      return { action: ANALYTIC_EVENT_NAMES.GLOBE_ROUND_FINISHED, game: '🌍', mode: event.mode, score: `${event.score}/${event.outOf}` };
  }
}

export function registerWorldlyApiRoutes(app: Express): void {
  // Registered first so progress snapshots get a larger body limit than events.
  app.use('/api/worldly/globe/progress', express.json({ limit: '128kb' }));
  app.use('/api/worldly', express.json({ limit: '16kb' }));
  app.use('/api/worldly', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.post('/api/worldly/globe/events', worldlyAuthMiddleware, (req: Request, res: Response) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    const event = parseGlobeEvent(req.body);
    if (!event) {
      res.status(400).json({ error: 'invalid_event' });
      return;
    }
    notify(BOT_CONFIG, toNotifyData(event), toUserDetails(user));
    res.status(204).end();
  });

  app.post('/api/worldly/globe/progress/sync', worldlyAuthMiddleware, async (req: Request, res: Response) => {
    const user = getRequestUser(req);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    const snapshot = parseGlobeSnapshot(req.body);
    if (!snapshot) {
      res.status(400).json({ error: 'invalid_progress' });
      return;
    }
    try {
      res.json({ snapshot: toSnapshot(await mergeGlobeProgressSync(user.telegramUserId, snapshot)) });
    } catch (err) {
      logger.error(`Failed to sync globe progress for ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'progress_unavailable' });
    }
  });
}
