import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WoltMongoModule } from '@core/mongo/wolt-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { WoltBotService } from './wolt-bot.service';
import { WoltSchedulerService } from './wolt-scheduler.service';
import { WoltService } from './wolt.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierBotModule, WoltMongoModule],
  providers: [WoltBotService, WoltSchedulerService, WoltService, TelegramBotsFactoryProvider(BOTS.WOLT)],
})
export class WoltBotModule {}
