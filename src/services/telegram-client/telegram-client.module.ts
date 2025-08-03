import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { FactoryProvider, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TELEGRAM_CLIENT_TOKEN } from '@services/telegram-client/telegram-client.config';
import { TelegramClientService } from './telegram-client.service';

export const TelegramClientProvider: FactoryProvider = {
  provide: TELEGRAM_CLIENT_TOKEN,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<TelegramClient> => {
    const apiId = configService.getOrThrow<number>('TELEGRAM_API_ID');
    const apiHash = configService.getOrThrow<string>('TELEGRAM_API_HASH');
    const stringSession = configService.getOrThrow<string>('TELEGRAM_STRING_SESSION');
    const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, { connectionRetries: 5 });
    await client.start({
      phoneNumber: null,
      password: null,
      phoneCode: null,
      onError: (err) => new Logger('TelegramClientProvider').error(err),
    });
    return client;
  },
};

@Module({
  providers: [TelegramClientService, TelegramClientProvider],
  exports: [TelegramClientService],
})
export class TelegramClientModule {}
