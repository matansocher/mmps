import { Module } from '@nestjs/common';
import { CookerMongoModule } from '@core/mongo/cooker-mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { RecipesCacheService } from './cache';
import { BOT_CONFIG } from './cooker.config';
import { CookerController } from './cooker.controller';
import { CookerService } from './cooker.service';

@Module({
  imports: [CookerMongoModule],
  providers: [CookerController, CookerService, RecipesCacheService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class CookerModule {}
