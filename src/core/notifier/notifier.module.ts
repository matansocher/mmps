import { Module } from '@nestjs/common';
import { CookerMongoModule } from '@core/mongo/cooker-mongo';
import { WoltMongoModule } from '@core/mongo/wolt-mongo';
import { WorldlyMongoModule } from '@core/mongo/worldly-mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { CookerService, RecipesCacheService } from './cooker';
import { BOT_CONFIG } from './notifier.config';
import { NotifierController } from './notifier.controller';
import { NotifierService } from './notifier.service';

@Module({
  imports: [WoltMongoModule, WorldlyMongoModule, CookerMongoModule],
  providers: [NotifierController, NotifierService, CookerService, RecipesCacheService, TelegramBotsFactoryProvider(BOT_CONFIG)],
  exports: [NotifierService],
})
export class NotifierModule {}
