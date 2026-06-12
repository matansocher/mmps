import type { Bot, Context, NextFunction } from 'grammy';
import { Logger } from '@core/utils';

const logger = new Logger('applyAllowlist');

export type AllowlistOptions = {
  readonly denyMessage?: string;
  readonly logDenied?: boolean;
};

export function applyAllowlist(bot: Bot, allowedUserIds: ReadonlyArray<number>, options: AllowlistOptions = {}): void {
  const { denyMessage, logDenied = true } = options;
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
    if (denyMessage && ctx.chat) {
      await ctx.reply(denyMessage).catch(() => {});
    }
  });
}
