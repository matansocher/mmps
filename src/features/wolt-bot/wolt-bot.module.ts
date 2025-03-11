import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WoltMongoModule } from '@core/mongo/wolt-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { RestaurantsService } from './restaurants.service';
import { WoltBotService } from './wolt-bot.service';
import { WoltSchedulerService } from './wolt-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierBotModule, WoltMongoModule],
  providers: [WoltBotService, WoltSchedulerService, RestaurantsService, TelegramBotsFactoryProvider(BOTS.WOLT)],
  exports: [TelegramBotsFactoryProvider(BOTS.WOLT)],
})
export class WoltBotModule {}
