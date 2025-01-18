import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotifierBotModule } from '@core/notifier-bot';
import { WoltMongoModule } from '@core/mongo/wolt-mongo';
import { BOTS, TelegramBotsFactoryModule } from '@services/telegram';
import { WoltModule } from '@services/wolt';
import { WoltBotService } from './wolt-bot.service';
import { WoltSchedulerService } from './wolt-scheduler.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotifierBotModule,
    TelegramBotsFactoryModule.forChild(BOTS.WOLT),
    WoltModule,
    WoltMongoModule,
  ],
  providers: [WoltBotService, WoltSchedulerService],
})
export class WoltBotModule {}
