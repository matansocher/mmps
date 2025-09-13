import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { RestaurantsService } from './restaurants.service';
import { WoltSchedulerService } from './wolt-scheduler.service';
import { BOT_CONFIG } from './wolt.config';
import { WoltController } from './wolt.controller';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierModule],
  providers: [WoltController, WoltSchedulerService, RestaurantsService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class WoltModule {}
