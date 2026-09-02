import type { Request, RequestHandler } from 'express';
import { env } from 'node:process';
import { createTelegramMiniAppAuthMiddleware } from '@shared/telegram-mini-app-auth';

export type MindloopAuthUser = {
  readonly telegramUserId: number;
  readonly username?: string;
  readonly firstName?: string;
  readonly lastName?: string;
};

/** Reads the authenticated Mindloop player off the request. */
export function getRequestPlayer(req: Request): MindloopAuthUser | undefined {
  return (req as Request & { mindloopUser?: MindloopAuthUser }).mindloopUser;
}

/**
 * Authenticates Mindloop API requests.
 *
 * - In production it verifies the Telegram WebApp `initData` (HMAC signed with
 *   the Mindloop bot token) sent in the `X-Telegram-Init-Data` header.
 * - Outside production it accepts a `X-Mindloop-Dev-User` header (or falls back
 *   to a fixed dev id) so the app is usable in a plain browser during local dev.
 */
export const mindloopAuthMiddleware: RequestHandler = createTelegramMiniAppAuthMiddleware<MindloopAuthUser>({
  devHeader: 'X-Mindloop-Dev-User',
  defaultDevUserId: 1,
  botTokenName: 'MINDLOOP_TELEGRAM_BOT_TOKEN',
  getBotToken: () => env.MINDLOOP_TELEGRAM_BOT_TOKEN,
  loggerName: 'mindloop:auth',
  mapUser: (verified) => ({
    telegramUserId: verified.telegramUserId,
    username: verified.username,
    firstName: verified.firstName,
    lastName: verified.lastName,
  }),
  assignUser: (req, user) => {
    (req as Request & { mindloopUser?: MindloopAuthUser }).mindloopUser = user;
  },
});
