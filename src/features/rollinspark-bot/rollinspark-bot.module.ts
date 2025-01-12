import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotifierBotModule } from '@core/notifier-bot';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { RollinsparkService } from './rollinspark.service';
import { RollinsparkBotService } from './rollinspark-bot.service';
import { RollinsparkSchedulerService } from './rollinspark-scheduler.service';
import { RollinsparkMongoModule } from '@core/mongo/rollinspark-mongo';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RollinsparkMongoModule,
    TelegramBotsFactoryModule.forChild(BOTS.ROLLINSPARK),
    TelegramModule,
    NotifierBotModule,
  ],
  providers: [RollinsparkBotService, RollinsparkSchedulerService, RollinsparkService],
})
export class RollinsparkBotModule {}
