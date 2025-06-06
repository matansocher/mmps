import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { DynamicModule, Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramClientFactoryOptions } from '../interface';
import { TELEGRAM_CLIENT_TOKEN } from '../telegram-client.config';

@Global()
@Module({})
export class TelegramClientFactoryModule {
  static forChild(options: TelegramClientFactoryOptions): DynamicModule {
    const { connectionRetries = 5 } = options;
    const TelegramClientProvider = {
      provide: TELEGRAM_CLIENT_TOKEN,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<TelegramClient> => {
        const apiId = configService.getOrThrow<number>('TELEGRAM_API_ID');
        const apiHash = configService.getOrThrow<string>('TELEGRAM_API_HASH');
        const stringSession = configService.getOrThrow<string>('TELEGRAM_STRING_SESSION');
        const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, { connectionRetries });
        await client.start({
          phoneNumber: null,
          password: null,
          phoneCode: null,
          onError: (err) => new Logger(TelegramClientFactoryModule.name).error(err),
        });
        return client;
      },
    };

    return {
      module: TelegramClientFactoryModule,
      providers: [TelegramClientProvider],
      exports: [TelegramClientProvider],
    };
  }
}
