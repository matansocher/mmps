import type { Express, Request, Response } from 'express';
import express from 'express';
import { getErrorMessage, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import type { TelegramBotConfig, UserDetails } from '@services/telegram';
import { getPlayer, mergeSync, recordResult, setFavorites } from '../mongo';
import { getRequestPlayer, type MindloopAuthUser, mindloopAuthMiddleware } from './auth.middleware';
import {
  type MindloopApiError,
  type MindloopPlayerResponse,
  parseFavoritesBody,
  parseRecordResultBody,
  parseSyncBody,
  toPlayerDto,
} from './dto';

const logger = new Logger('mindloop:api');

const NOTIFY_SOURCE: TelegramBotConfig = {
  id: 'MINDLOOP',
  name: 'Mindloop 🧠',
  token: 'NOTIFIER_TELEGRAM_BOT_TOKEN',
};

function toUserDetails(user: MindloopAuthUser): UserDetails {
  return {
    chatId: user.telegramUserId,
    telegramUserId: user.telegramUserId,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    username: user.username ?? '',
  };
}

export function registerMindloopApiRoutes(app: Express): void {
  app.use('/api/mindloop', express.json({ limit: '256kb' }));
  app.use('/api/mindloop', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Every player route requires an authenticated Telegram (or dev) user.
  app.use('/api/mindloop/player', mindloopAuthMiddleware);

  app.get('/api/mindloop/player', async (req: Request, res: Response<MindloopPlayerResponse | MindloopApiError>) => {
    const user = getRequestPlayer(req);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    try {
      const player = await getPlayer(user.telegramUserId);
      notify(NOTIFY_SOURCE, { action: 'app_opened' }, toUserDetails(user));
      res.json({ player: toPlayerDto(player) });
    } catch (err) {
      logger.error(`Failed to load player ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'player_load_failed' });
    }
  });

  // Record a finished run (updates best score + play history).
  app.post('/api/mindloop/player/result', async (req: Request, res: Response<MindloopPlayerResponse | MindloopApiError>) => {
    const user = getRequestPlayer(req);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    const body = parseRecordResultBody(req.body);
    if (!body) {
      res.status(400).json({ error: 'invalid_result' });
      return;
    }
    try {
      const player = await recordResult(user.telegramUserId, body);
      notify(NOTIFY_SOURCE, { action: 'game_played', game: body.gameId, score: body.score }, toUserDetails(user));
      res.json({ player: toPlayerDto(player) });
    } catch (err) {
      logger.error(`Failed to record result for ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'result_save_failed' });
    }
  });

  app.put('/api/mindloop/player/favorites', async (req: Request, res: Response<MindloopPlayerResponse | MindloopApiError>) => {
    const user = getRequestPlayer(req);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    const favorites = parseFavoritesBody(req.body);
    if (!favorites) {
      res.status(400).json({ error: 'invalid_favorites' });
      return;
    }
    try {
      const player = await setFavorites(user.telegramUserId, favorites);
      res.json({ player: toPlayerDto(player) });
    } catch (err) {
      logger.error(`Failed to save favorites for ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'favorites_save_failed' });
    }
  });

  // Merge a full client snapshot (used once on startup to reconcile offline data).
  app.post('/api/mindloop/player/sync', async (req: Request, res: Response<MindloopPlayerResponse | MindloopApiError>) => {
    const user = getRequestPlayer(req);
    if (!user) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    const data = parseSyncBody(req.body);
    if (!data) {
      res.status(400).json({ error: 'invalid_sync' });
      return;
    }
    try {
      const player = await mergeSync(user.telegramUserId, data);
      res.json({ player: toPlayerDto(player) });
    } catch (err) {
      logger.error(`Failed to sync player ${user.telegramUserId}: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'sync_failed' });
    }
  });

  logger.log('Mindloop API routes registered at /api/mindloop/*');
}
