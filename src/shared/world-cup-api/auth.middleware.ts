import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { verifyWorldCupInitData } from './telegram-init-data';

const logger = new Logger('worldCupAuthMiddleware');

export type WorldCupRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
  readonly firstName?: string;
};

declare module 'express-serve-static-core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Request {
    worldCupUser?: WorldCupRequestUser;
  }
}

export async function worldCupAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    const devUserId = req.header('X-WorldCup-Dev-User') || env.DEV_USER_ID;
    if (devUserId) {
      const id = Number(devUserId);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid_dev_user' });
        return;
      }
      req.worldCupUser = { telegramUserId: id, chatId: id, username: 'devuser', firstName: 'Dev' };
      next();
      return;
    }
  }

  const initData = req.header('X-Telegram-Init-Data');
  if (!initData) {
    res.status(401).json({ error: 'missing_init_data' });
    return;
  }

  const botToken = env.WORLD_CUP_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('WORLD_CUP_TELEGRAM_BOT_TOKEN not configured');
    res.status(500).json({ error: 'bot_not_configured' });
    return;
  }

  const verified = verifyWorldCupInitData(initData, botToken);
  if (!verified) {
    res.status(401).json({ error: 'invalid_init_data' });
    return;
  }

  req.worldCupUser = {
    telegramUserId: verified.telegramUserId,
    chatId: verified.telegramUserId,
    username: verified.username,
    firstName: verified.firstName,
  };
  next();
}
