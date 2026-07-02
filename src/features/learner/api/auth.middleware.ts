import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { verifyLearnerInitData } from './telegram-init-data';

const logger = new Logger('learnerAuthMiddleware');

export type LearnerRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
  readonly firstName?: string;
  readonly lastName?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    learnerUser?: LearnerRequestUser;
  }
}

export async function learnerAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    const devUserId = req.header('X-Learner-Dev-User') || env.DEV_USER_ID;
    if (devUserId) {
      const id = Number(devUserId);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid_dev_user' });
        return;
      }
      req.learnerUser = { telegramUserId: id, chatId: id, username: 'devuser' };
      next();
      return;
    }
  }

  const initData = req.header('X-Telegram-Init-Data');
  if (!initData) {
    res.status(401).json({ error: 'missing_init_data' });
    return;
  }

  const botToken = env.LEARNER_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('LEARNER_TELEGRAM_BOT_TOKEN not configured');
    res.status(500).json({ error: 'bot_not_configured' });
    return;
  }

  const verified = verifyLearnerInitData(initData, botToken);
  if (!verified) {
    res.status(401).json({ error: 'invalid_init_data' });
    return;
  }

  req.learnerUser = {
    telegramUserId: verified.telegramUserId,
    chatId: verified.telegramUserId,
    username: verified.username,
    firstName: verified.firstName,
    lastName: verified.lastName,
  };
  next();
}
