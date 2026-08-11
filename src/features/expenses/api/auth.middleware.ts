import type { Request } from 'express';
import { env } from 'node:process';
import { MY_USER_ID } from '@core/config';
import { createTelegramMiniAppAuthMiddleware } from '@shared/telegram-mini-app-auth';

export type ExpensesRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
  readonly firstName?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    expensesUser?: ExpensesRequestUser;
  }
}

export const expensesAuthMiddleware = createTelegramMiniAppAuthMiddleware<ExpensesRequestUser>({
  devHeader: 'X-Expenses-Dev-User',
  defaultDevUserId: MY_USER_ID,
  botTokenName: 'EXPENSES_TELEGRAM_BOT_TOKEN',
  getBotToken: () => env.EXPENSES_TELEGRAM_BOT_TOKEN,
  loggerName: 'expenses:api:auth',
  mapUser: (verified) => ({
    telegramUserId: verified.telegramUserId,
    chatId: verified.telegramUserId,
    username: verified.username,
    firstName: verified.firstName,
  }),
  assignUser: (req, user) => {
    req.expensesUser = user;
  },
});
