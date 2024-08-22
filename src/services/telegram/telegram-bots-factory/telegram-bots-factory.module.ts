import TelegramBot from 'node-telegram-bot-api';
import { Module, DynamicModule, Global } from '@nestjs/common';
import { BOTS } from '@services/telegram/telegram.config';
import { TelegramBotFactory } from '@services/telegram/interface';

@Global()
@Module({})
export class TelegramBotsFactoryModule {
  static forChild(options: TelegramBotFactory): DynamicModule {
    const botProvider = {
      provide: options.botName,
      useFactory: async (): Promise<TelegramBot> => {
        const botKey = Object.keys(BOTS).find((botKey: string) => BOTS[botKey].name === options.botName);
        const token = BOTS[botKey].token;
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
