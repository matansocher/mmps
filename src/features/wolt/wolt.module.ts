import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WoltMongoModule } from '@core/mongo/wolt-mongo';
import { NotifierModule } from '@core/notifier';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { RestaurantsService } from './restaurants.service';
import { WoltSchedulerService } from './wolt-scheduler.service';
import { WoltController } from './wolt.controller';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierModule, WoltMongoModule],
  providers: [WoltController, WoltSchedulerService, RestaurantsService, TelegramBotsFactoryProvider(BOTS.WOLT)],
  exports: [TelegramBotsFactoryProvider(BOTS.WOLT)],
})
export class WoltModule {}
