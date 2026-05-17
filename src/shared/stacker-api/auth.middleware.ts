import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { upsertStackerUser } from '@shared/stacker';
import { verifyInitData } from './telegram-init-data';

const logger = new Logger('stackerAuthMiddleware');

export type StackerRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    stackerUser?: StackerRequestUser;
  }
}

export async function stackerAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Dev escape hatch — only when explicitly enabled
  if (env.NODE_ENV !== 'production') {
    const devUserId = req.header('X-Stacker-Dev-User');
    if (devUserId) {
      const id = Number(devUserId);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid_dev_user' });
        return;
      }
      await upsertStackerUser(id, id, 'devuser');
      req.stackerUser = { telegramUserId: id, chatId: id, username: 'devuser' };
      next();
      return;
    }
  }

  const initData = req.header('X-Telegram-Init-Data');
  if (!initData) {
    res.status(401).json({ error: 'missing_init_data' });
    return;
  }

  const botToken = env.STACKER_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('STACKER_TELEGRAM_BOT_TOKEN not configured');
    res.status(500).json({ error: 'bot_not_configured' });
    return;
  }

  const verified = verifyInitData(initData, botToken);
  if (!verified) {
    res.status(401).json({ error: 'invalid_init_data' });
    return;
  }

  const chatId = verified.telegramUserId;
  await upsertStackerUser(chatId, verified.telegramUserId, verified.username);
  req.stackerUser = { telegramUserId: verified.telegramUserId, chatId, username: verified.username };
  next();
}
