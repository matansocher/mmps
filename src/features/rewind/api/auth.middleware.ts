import type { Request, RequestHandler } from 'express';
import { env } from 'node:process';
import { createTelegramMiniAppAuthMiddleware } from '@shared/telegram-mini-app-auth';

type RewindRequest = Request & { rewindUserId?: number };
export const getRewindUserId = (req: Request): number | undefined => (req as RewindRequest).rewindUserId;

export const rewindAuthMiddleware: RequestHandler = createTelegramMiniAppAuthMiddleware({
  devHeader: 'X-Rewind-Dev-User',
  botTokenName: 'REWIND_TELEGRAM_BOT_TOKEN or WORLDLY_TELEGRAM_BOT_TOKEN',
  getBotToken: () => env.REWIND_TELEGRAM_BOT_TOKEN || env.WORLDLY_TELEGRAM_BOT_TOKEN,
  loggerName: 'rewind:auth',
  mapUser: (verified) => verified.telegramUserId,
  assignUser: (req, id) => {
    (req as RewindRequest).rewindUserId = id;
  },
});
