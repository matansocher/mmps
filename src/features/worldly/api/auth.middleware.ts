import type { Request, RequestHandler } from 'express';
import { env } from 'node:process';
import { createTelegramMiniAppAuthMiddleware } from '@shared/telegram-mini-app-auth';

export type WorldlyAuthUser = {
  readonly telegramUserId: number;
  readonly username?: string;
  readonly firstName?: string;
  readonly lastName?: string;
};

export function getRequestUser(req: Request): WorldlyAuthUser | undefined {
  return (req as Request & { worldlyUser?: WorldlyAuthUser }).worldlyUser;
}

// Verifies Telegram WebApp initData signed by the Worldly bot (X-Telegram-Init-Data), and accepts
// a X-Worldly-Dev-User header outside production so the globe works in a plain browser.
export const worldlyAuthMiddleware: RequestHandler = createTelegramMiniAppAuthMiddleware<WorldlyAuthUser>({
  devHeader: 'X-Worldly-Dev-User',
  defaultDevUserId: 1,
  botTokenName: 'WORLDLY_TELEGRAM_BOT_TOKEN',
  getBotToken: () => env.WORLDLY_TELEGRAM_BOT_TOKEN,
  loggerName: 'worldly:auth',
  mapUser: (verified) => ({
    telegramUserId: verified.telegramUserId,
    username: verified.username,
    firstName: verified.firstName,
    lastName: verified.lastName,
  }),
  assignUser: (req, user) => {
    (req as Request & { worldlyUser?: WorldlyAuthUser }).worldlyUser = user;
  },
});
