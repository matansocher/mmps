import type { Bot, Context, NextFunction } from 'grammy';
import { Logger } from '@core/utils';
import type { UserDetails } from '../types';
import { getMessageData } from './get-message-data';

const logger = new Logger('applyAllowlist');

export type AllowlistOptions = {
  readonly denyMessage?: string;
  readonly logDenied?: boolean;
  readonly onDeny?: (userDetails: UserDetails) => void;
};

export function applyAllowlist(bot: Bot, allowedUserIds: ReadonlyArray<number>, options: AllowlistOptions = {}): void {
  const { denyMessage, logDenied = true, onDeny } = options;
  const allowed = new Set<number>(allowedUserIds);

  bot.use(async (ctx: Context, next: NextFunction) => {
    const userId = ctx.from?.id;
    if (userId && allowed.has(userId)) {
      await next();
      return;
    }
    if (logDenied) {
      logger.warn(`Blocked update from userId=${userId ?? 'unknown'} username=${ctx.from?.username ?? '-'}`);
    }
    if (onDeny) {
      try {
        const { userDetails } = getMessageData(ctx);
        onDeny(userDetails);
      } catch {
        /* ignore — onDeny is best-effort */
      }
    }
    if (denyMessage && ctx.chat) {
      await ctx.reply(denyMessage).catch(() => {});
    }
  });
}
