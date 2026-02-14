import type { Context, NextFunction } from 'grammy';
import type { UserDetails } from '../types';

type SaveUserDetailsFn = (userDetails: UserDetails) => Promise<boolean>;

const userExistsMap = new WeakMap<object, boolean>();

function extractUserDetails(ctx: Context): UserDetails | null {
  if (!ctx.chat?.id || !ctx.from?.id) return null;
  return {
    chatId: ctx.chat.id,
    telegramUserId: ctx.from.id,
    firstName: ctx.from.first_name ?? '',
    lastName: ctx.from.last_name ?? '',
    username: ctx.from.username ?? '',
  };
}

export function createUserTrackingMiddleware(saveUserDetails: SaveUserDetailsFn) {
  return async (ctx: Context, next: NextFunction) => {
    const userDetails = extractUserDetails(ctx);
    if (userDetails) {
      const userExists = await saveUserDetails(userDetails);
      userExistsMap.set(ctx, userExists);
    }
    await next();
  };
}

export function isExistingUser(ctx: Context): boolean {
  return userExistsMap.get(ctx) ?? false;
}
