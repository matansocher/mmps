import type { Request } from 'express';
import { env } from 'node:process';
import { MY_USER_ID } from '@core/config';
import { createTelegramMiniAppAuthMiddleware } from '@shared/telegram-mini-app-auth';

export type CoachRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    coachUser?: CoachRequestUser;
  }
}

export const coachAuthMiddleware = createTelegramMiniAppAuthMiddleware<CoachRequestUser>({
  devHeader: 'X-Coach-Dev-User',
  defaultDevUserId: MY_USER_ID,
  botTokenName: 'COACH_TELEGRAM_BOT_TOKEN',
  getBotToken: () => env.COACH_TELEGRAM_BOT_TOKEN,
  loggerName: 'coach:api:auth',
  mapUser: (verified) => ({
    telegramUserId: verified.telegramUserId,
    chatId: verified.telegramUserId,
    username: verified.username,
  }),
  assignUser: (req, user) => {
    req.coachUser = user;
  },
});
