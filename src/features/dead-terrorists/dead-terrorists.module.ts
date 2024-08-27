import { Module } from '@nestjs/common';
import { TelegramClientFactoryModule } from '@services/telegram-client/telegram-client-factory/telegram-client-factory.module';
import { TELEGRAM_API_HASH, TELEGRAM_API_ID, TELEGRAM_CLIENT_TOKEN, TELEGRAM_STRING_SESSION } from '@services/telegram-client/telegram-client.config';
import { TelegramClientModule } from '@services/telegram-client/telegram-client.module';
import { DeadTerroristsService } from './dead-terrorists.service';

@Module({
  imports: [
    TelegramClientModule,
    TelegramClientFactoryModule.forChild({
      name: TELEGRAM_CLIENT_TOKEN,
      stringSession: TELEGRAM_STRING_SESSION,
      apiId: parseInt(TELEGRAM_API_ID),
      apiHash: TELEGRAM_API_HASH,
    }),
  ],
  providers: [DeadTerroristsService],
})
export class DeadTerroristsModule {}
