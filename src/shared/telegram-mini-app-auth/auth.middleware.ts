import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import { type VerifiedTelegramInitData, verifyTelegramInitData } from './telegram-init-data';

export type TelegramMiniAppAuthOptions<TUser> = {
  readonly devHeader: string;
  readonly defaultDevUserId?: string | number;
  readonly botTokenName: string;
  readonly getBotToken: () => string | undefined;
  readonly loggerName: string;
  readonly mapUser: (verified: VerifiedTelegramInitData) => TUser;
  readonly assignUser: (req: Request, user: TUser) => void;
};

export function createTelegramMiniAppAuthMiddleware<TUser>(options: TelegramMiniAppAuthOptions<TUser>): RequestHandler {
  const logger = new Logger(options.loggerName);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (env.NODE_ENV !== 'production') {
      const devUserId = req.header(options.devHeader) || options.defaultDevUserId;
      if (devUserId) {
        const id = Number(devUserId);
        if (!Number.isFinite(id)) {
          res.status(400).json({ error: 'invalid_dev_user' });
          return;
        }

        options.assignUser(
          req,
          options.mapUser({
            telegramUserId: id,
            username: 'devuser',
            authDate: 0,
          }),
        );
        next();
        return;
      }
    }

    const initData = req.header('X-Telegram-Init-Data');
    if (!initData) {
      res.status(401).json({ error: 'missing_init_data' });
      return;
    }

    const botToken = options.getBotToken();
    if (!botToken) {
      logger.error(`${options.botTokenName} not configured`);
      res.status(500).json({ error: 'bot_not_configured' });
      return;
    }

    const verified = verifyTelegramInitData(initData, botToken);
    if (!verified) {
      res.status(401).json({ error: 'invalid_init_data' });
      return;
    }

    options.assignUser(req, options.mapUser(verified));
    next();
  };
}
