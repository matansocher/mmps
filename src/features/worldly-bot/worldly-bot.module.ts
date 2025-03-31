import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WorldlyMongoModule } from '@core/mongo/worldly-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { WorldlyBotService } from './worldly-bot.service';
import { WorldlyBotSchedulerService } from './worldly-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), WorldlyMongoModule, NotifierBotModule],
  providers: [WorldlyBotService, WorldlyBotSchedulerService, TelegramBotsFactoryProvider(BOTS.WORLDLY)],
  exports: [TelegramBotsFactoryProvider(BOTS.WORLDLY)],
})
export class WorldlyBotModule {}
