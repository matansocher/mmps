import TelegramBot from 'node-telegram-bot-api';
import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createErrorEventListeners, type TelegramBotConfig } from '@services/telegram';

export const TelegramBotsFactoryProvider = (botConfig: TelegramBotConfig): Provider => {
  return {
    inject: [ConfigService],
    provide: botConfig.id,
    useFactory: (configService: ConfigService): TelegramBot => {
      const token = configService.getOrThrow(botConfig.token);
      const bot = new TelegramBot(token, { polling: true });
      createErrorEventListeners(bot, botConfig.name);
      return bot;
    },
  };
};
