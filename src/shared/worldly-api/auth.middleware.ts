import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { verifyWorldlyInitData } from './telegram-init-data';

const logger = new Logger('worldlyAuthMiddleware');

export type WorldlyRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    worldlyUser?: WorldlyRequestUser;
  }
}

export async function worldlyAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    const devUserId = req.header('X-Worldly-Dev-User') ?? env.WORLDLY_DEV_USER_ID;
    if (devUserId) {
      const id = Number(devUserId);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid_dev_user' });
        return;
      }
      req.worldlyUser = { telegramUserId: id, chatId: id, username: 'devuser' };
      next();
      return;
    }
  }

  const initData = req.header('X-Telegram-Init-Data');
  if (!initData) {
    res.status(401).json({ error: 'missing_init_data' });
    return;
  }

  const botToken = env.WORLDLY_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('WORLDLY_TELEGRAM_BOT_TOKEN not configured');
    res.status(500).json({ error: 'bot_not_configured' });
    return;
  }

  const verified = verifyWorldlyInitData(initData, botToken);
  if (!verified) {
    res.status(401).json({ error: 'invalid_init_data' });
    return;
  }

  req.worldlyUser = {
    telegramUserId: verified.telegramUserId,
    chatId: verified.telegramUserId,
    username: verified.username,
  };
  next();
}
