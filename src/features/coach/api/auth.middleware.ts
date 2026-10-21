import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from 'node:process';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { findDashboardUserByAccessToken } from '@shared/coach';
import { createTelegramMiniAppAuthMiddleware } from '@shared/telegram-mini-app-auth';

export const COACH_TOKEN_HEADER = 'X-Coach-Token';

export type CoachAuthUser = {
  readonly telegramUserId: number;
};

const logger = new Logger('coach:api:auth');

export function getCoachUser(req: Request): CoachAuthUser | undefined {
  return (req as Request & { coachUser?: CoachAuthUser }).coachUser;
}

function assignCoachUser(req: Request, user: CoachAuthUser): void {
  (req as Request & { coachUser?: CoachAuthUser }).coachUser = user;
}

const telegramAuthMiddleware = createTelegramMiniAppAuthMiddleware<CoachAuthUser>({
  devHeader: 'X-Coach-Dev-User',
  defaultDevUserId: MY_USER_ID || undefined,
  botTokenName: 'COACH_TELEGRAM_BOT_TOKEN',
  getBotToken: () => env.COACH_TELEGRAM_BOT_TOKEN,
  loggerName: 'coach:api:telegram-auth',
  mapUser: (verified) => ({ telegramUserId: verified.telegramUserId }),
  assignUser: assignCoachUser,
});

// Inside Telegram the mini-app sends verified initData; in a plain browser it sends the private access token from the bot's /dashboard link.
export const coachAuthMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.header(COACH_TOKEN_HEADER);
  if (token && !req.header('X-Telegram-Init-Data')) {
    try {
      const telegramUserId = await findDashboardUserByAccessToken(token);
      if (!telegramUserId) {
        res.status(401).json({ error: 'invalid_token' });
        return;
      }
      assignCoachUser(req, { telegramUserId });
      next();
    } catch (err) {
      logger.error(`Token lookup failed: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'auth_failed' });
    }
    return;
  }
  telegramAuthMiddleware(req, res, next);
};
