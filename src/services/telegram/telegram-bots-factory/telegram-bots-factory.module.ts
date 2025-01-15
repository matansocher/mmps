import TelegramBot from 'node-telegram-bot-api';
import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotFactoryOptions } from '@services/telegram';

@Global()
@Module({})
export class TelegramBotsFactoryModule {
  static forChild(options: TelegramBotFactoryOptions): DynamicModule {
    const botProvider = {
      inject: [ConfigService],
      provide: options.id,
      useFactory: async (configService: ConfigService): Promise<TelegramBot> => {
        const token = configService.getOrThrow(options.token);
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
