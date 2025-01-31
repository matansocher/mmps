import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RollinsparkMongoModule } from '@core/mongo/rollinspark-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { RollinsparkBotService } from './rollinspark-bot.service';
import { RollinsparkSchedulerService } from './rollinspark-scheduler.service';
import { RollinsparkService } from './rollinspark.service';

@Module({
  imports: [ScheduleModule.forRoot(), RollinsparkMongoModule, NotifierBotModule],
  providers: [RollinsparkBotService, RollinsparkSchedulerService, RollinsparkService, TelegramBotsFactoryProvider(BOTS.ROLLINSPARK)],
})
export class RollinsparkBotModule {}
