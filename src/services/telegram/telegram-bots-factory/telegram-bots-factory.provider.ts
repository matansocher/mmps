import { Provider } from '@nestjs/common';
import { TelegramBotConfig } from '@services/telegram';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';
import { createErrorEventListeners } from '@services/telegram/telegram-bots-factory/telegram-bot-error-handler';

export const TelegramBotsFactoryProvider = (options: TelegramBotConfig): Provider => {
  return {
    inject: [ConfigService],
    provide: options.id,
    useFactory: async (configService: ConfigService): Promise<TelegramBot> => {
      const token = configService.getOrThrow(options.token);
      const bot = new TelegramBot(token, { polling: true });
      createErrorEventListeners(bot, options.name);
      return bot;
    },
  };
}