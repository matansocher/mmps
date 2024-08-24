import TelegramBot from 'node-telegram-bot-api';
import { Module, DynamicModule, Global } from '@nestjs/common';
import { TelegramBotFactoryOptions } from '@services/telegram/interface';

@Global()
@Module({})
export class TelegramBotsFactoryModule {
  static forChild(options: TelegramBotFactoryOptions): DynamicModule {
    const botProvider = {
      provide: options.name,
      useFactory: async (): Promise<TelegramBot> => {
        const token = options.token;
        return new TelegramBot(token, { polling: true });
      },
    };

    return {
      module: TelegramBotsFactoryModule,
      providers: [botProvider],
      exports: [botProvider],
    };
  }
}
