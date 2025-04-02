import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CoachMongoModule } from '@core/mongo/coach-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierBotModule, CoachMongoModule],
  providers: [CoachController, CoachBotSchedulerService, CoachService, TelegramBotsFactoryProvider(BOTS.COACH)],
  exports: [TelegramBotsFactoryProvider(BOTS.COACH)],
})
export class CoachModule {}
