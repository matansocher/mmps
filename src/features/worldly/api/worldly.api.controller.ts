import type { Express, Request, Response } from 'express';
import express from 'express';
import { notify } from '@services/notifier';
import type { UserDetails } from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from '../worldly.config';
import { getRequestUser, worldlyAuthMiddleware, type WorldlyAuthUser } from './auth.middleware';
import { type GlobeEvent, parseGlobeEvent } from './dto';

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
}
