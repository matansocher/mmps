import type { Request } from 'express';
import { env } from 'node:process';
import { MY_USER_ID } from '@core/config';
import { createTelegramMiniAppAuthMiddleware } from '@shared/telegram-mini-app-auth';

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

export const learnerAuthMiddleware = createTelegramMiniAppAuthMiddleware<LearnerRequestUser>({
  devHeader: 'X-Learner-Dev-User',
  defaultDevUserId: MY_USER_ID,
  botTokenName: 'LEARNER_TELEGRAM_BOT_TOKEN',
  getBotToken: () => env.LEARNER_TELEGRAM_BOT_TOKEN,
  loggerName: 'learner:api:auth',
  mapUser: (verified) => ({
    telegramUserId: verified.telegramUserId,
    chatId: verified.telegramUserId,
    username: verified.username,
    firstName: verified.firstName,
    lastName: verified.lastName,
  }),
  assignUser: (req, user) => {
    req.learnerUser = user;
  },
});
