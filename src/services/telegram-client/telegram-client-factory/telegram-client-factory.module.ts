import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Module, DynamicModule, Global } from '@nestjs/common';
import { ITelegramClientFactoryOptions } from '../interface';

@Global()
@Module({})
export class TelegramClientFactoryModule {
  static forChild(options: ITelegramClientFactoryOptions): DynamicModule {
    const { name, apiId, apiHash, stringSession, connectionRetries = 5 } = options;
    const TelegramClientProvider = {
      provide: name,
      useFactory: async (): Promise<TelegramClient> => {
        const client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, { connectionRetries });
        await client.start({ phoneNumber: null, password: null, phoneCode: null, onError: (err) => console.log(err) });
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
