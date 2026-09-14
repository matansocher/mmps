import type { Request, RequestHandler } from 'express';
import { env } from 'node:process';
import { createTelegramMiniAppAuthMiddleware } from '@shared/telegram-mini-app-auth';

export type LearnerAuthUser = {
  readonly telegramUserId: number;
  readonly username?: string;
  readonly firstName?: string;
  readonly lastName?: string;
};

export function getRequestUser(req: Request): LearnerAuthUser | undefined {
  return (req as Request & { learnerUser?: LearnerAuthUser }).learnerUser;
}

// Verifies Telegram WebApp initData in production (X-Telegram-Init-Data), and accepts
// a X-Learner-Dev-User header outside production so the app works in a plain browser.
export const learnerAuthMiddleware: RequestHandler = createTelegramMiniAppAuthMiddleware<LearnerAuthUser>({
  devHeader: 'X-Learner-Dev-User',
  defaultDevUserId: 1,
  botTokenName: 'LEARNER_TELEGRAM_BOT_TOKEN',
  getBotToken: () => env.LEARNER_TELEGRAM_BOT_TOKEN,
  loggerName: 'learner:auth',
  mapUser: (verified) => ({
    telegramUserId: verified.telegramUserId,
    username: verified.username,
    firstName: verified.firstName,
    lastName: verified.lastName,
  }),
  assignUser: (req, user) => {
    (req as Request & { learnerUser?: LearnerAuthUser }).learnerUser = user;
  },
});
