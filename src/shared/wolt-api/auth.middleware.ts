import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { verifyWoltInitData } from './telegram-init-data';

const logger = new Logger('woltAuthMiddleware');

export type WoltRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
  readonly firstName?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    woltUser?: WoltRequestUser;
  }
}

export async function woltAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    const devUserId = req.header('X-Wolt-Dev-User') || env.DEV_USER_ID;
    if (devUserId) {
      const id = Number(devUserId);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid_dev_user' });
        return;
      }
      req.woltUser = { telegramUserId: id, chatId: id, username: 'devuser', firstName: 'Dev' };
      next();
      return;
    }
  }

  const initData = req.header('X-Telegram-Init-Data');
  if (!initData) {
    res.status(401).json({ error: 'missing_init_data' });
    return;
  }

  const botToken = env.WOLT_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('WOLT_TELEGRAM_BOT_TOKEN not configured');
    res.status(500).json({ error: 'bot_not_configured' });
    return;
  }

  const verified = verifyWoltInitData(initData, botToken);
  if (!verified) {
    res.status(401).json({ error: 'invalid_init_data' });
    return;
  }

  req.woltUser = {
    telegramUserId: verified.telegramUserId,
    chatId: verified.telegramUserId,
    username: verified.username,
    firstName: verified.firstName,
  };
  next();
}
