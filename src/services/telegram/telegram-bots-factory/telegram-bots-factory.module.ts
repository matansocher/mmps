import TelegramBot from 'node-telegram-bot-api';
import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotConfig } from '../interface';
import { createErrorEventListeners } from './telegram-bot-error-handler';

@Global()
@Module({})
export class TelegramBotsFactoryModule {
  static forChild(options: TelegramBotConfig): DynamicModule {
    const botProvider = {
      inject: [ConfigService],
      provide: options.id,
      useFactory: async (configService: ConfigService): Promise<TelegramBot> => {
        const token = configService.getOrThrow(options.token);
        const bot = new TelegramBot(token, { polling: true });
        createErrorEventListeners(bot, options.name);
        return bot;
      },
    };

    return {
      module: TelegramBotsFactoryModule,
      providers: [botProvider],
      exports: [botProvider],
    };
  }
}
