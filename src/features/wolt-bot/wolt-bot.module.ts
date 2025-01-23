import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotifierBotModule } from '@core/notifier-bot';
import { WoltMongoModule } from '@core/mongo/wolt-mongo';
import { BOTS, TelegramBotsFactoryModule } from '@services/telegram';
import { WoltService } from './wolt.service';
import { WoltBotService } from './wolt-bot.service';
import { WoltSchedulerService } from './wolt-scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotifierBotModule,
    TelegramBotsFactoryModule.forChild(BOTS.WOLT),
    WoltMongoModule,
  ],
  providers: [WoltBotService, WoltSchedulerService, WoltService],
})
export class WoltBotModule {}
