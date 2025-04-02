import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WorldlyMongoModule } from '@core/mongo/worldly-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { WorldlyBotSchedulerService } from './worldly-scheduler.service';
import { WorldlyController } from './worldly.controller';

@Module({
  imports: [ScheduleModule.forRoot(), WorldlyMongoModule, NotifierBotModule],
  providers: [WorldlyController, WorldlyBotSchedulerService, TelegramBotsFactoryProvider(BOTS.WORLDLY)],
  exports: [TelegramBotsFactoryProvider(BOTS.WORLDLY)],
})
export class WorldlyModule {}
