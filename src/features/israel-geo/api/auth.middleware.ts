import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import type { IsraelGeoRequestUser } from '../types';
import { verifyIsraelGeoInitData } from './telegram-init-data';

const logger = new Logger('israelGeoAuthMiddleware');

export type IsraelGeoAuthenticatedRequest = Request & {
  israelGeoUser: IsraelGeoRequestUser;
};

export function israelGeoAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV !== 'production') {
    const telegramUserId = Number(env.MY_USER_ID || 1);
    if (!Number.isFinite(telegramUserId)) {
      res.status(500).json({ error: 'invalid_dev_user' });
      return;
    }
    (req as IsraelGeoAuthenticatedRequest).israelGeoUser = { telegramUserId, username: 'devuser', firstName: 'Navigator' };
    next();
    return;
  }

  const initData = req.header('X-Telegram-Init-Data');
  if (!initData) {
    res.status(401).json({ error: 'missing_init_data' });
    return;
  }
  const botToken = env.ISRAEL_GEO_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('ISRAEL_GEO_TELEGRAM_BOT_TOKEN not configured');
    res.status(500).json({ error: 'bot_not_configured' });
    return;
  }
  const user = verifyIsraelGeoInitData(initData, botToken);
  if (!user) {
    res.status(401).json({ error: 'invalid_init_data' });
    return;
  }
  (req as IsraelGeoAuthenticatedRequest).israelGeoUser = user;
  next();
}
