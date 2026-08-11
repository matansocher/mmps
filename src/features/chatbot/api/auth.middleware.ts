import type { Request } from 'express';
import { env } from 'node:process';
import { MY_USER_ID } from '@core/config';
import { createTelegramMiniAppAuthMiddleware } from '@shared/telegram-mini-app-auth';

export type ChatbotRequestUser = {
  readonly telegramUserId: number;
  readonly chatId: number;
  readonly username?: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    chatbotUser?: ChatbotRequestUser;
  }
}

export const chatbotAuthMiddleware = createTelegramMiniAppAuthMiddleware<ChatbotRequestUser>({
  devHeader: 'X-Chatbot-Dev-User',
  defaultDevUserId: MY_USER_ID,
  botTokenName: 'CHATBOT_TELEGRAM_BOT_TOKEN',
  getBotToken: () => env.CHATBOT_TELEGRAM_BOT_TOKEN,
  loggerName: 'chatbot:api:auth',
  mapUser: (verified) => ({
    telegramUserId: verified.telegramUserId,
    chatId: verified.telegramUserId,
    username: verified.username,
  }),
  assignUser: (req, user) => {
    req.chatbotUser = user;
  },
});
