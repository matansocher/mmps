import { Module } from '@nestjs/common';
import { CookerMongoModule } from '@core/mongo/cooker-mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { BOT_CONFIG } from './cooker.config';
import { CookerController } from './cooker.controller';

@Module({
  imports: [CookerMongoModule],
  providers: [CookerController, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class CookerModule {}
