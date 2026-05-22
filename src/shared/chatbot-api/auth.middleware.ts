import type { NextFunction, Request, Response } from 'express';
import { env } from 'node:process';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { verifyChatbotInitData } from './telegram-init-data';

const logger = new Logger('chatbotAuthMiddleware');

export type ChatbotRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    chatbotUser?: ChatbotRequestUser;
  }
}

export async function chatbotAuthMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (env.NODE_ENV !== 'production') {
    const devUserId = req.header('X-Chatbot-Dev-User') || env.DEV_USER_ID;
    if (devUserId) {
      const id = Number(devUserId);
      if (!Number.isFinite(id)) {
        res.status(400).json({ error: 'invalid_dev_user' });
        return;
      }
      req.chatbotUser = { telegramUserId: id, chatId: id, username: 'devuser' };
      next();
      return;
    }
  }

  const initData = req.header('X-Telegram-Init-Data');
  if (!initData) {
    res.status(401).json({ error: 'missing_init_data' });
    return;
  }

  const botToken = env.CHATBOT_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    logger.error('CHATBOT_TELEGRAM_BOT_TOKEN not configured');
    res.status(500).json({ error: 'bot_not_configured' });
    return;
  }

  const verified = verifyChatbotInitData(initData, botToken);
  if (!verified) {
    res.status(401).json({ error: 'invalid_init_data' });
    return;
  }

  req.chatbotUser = {
    telegramUserId: verified.telegramUserId,
    chatId: verified.telegramUserId,
    username: verified.username,
  };
  next();
}
