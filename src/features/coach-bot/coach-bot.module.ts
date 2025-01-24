import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CoachMongoModule } from '@core/mongo/coach-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { CoachService } from './coach.service';
import { CoachBotService } from './coach-bot.service';
import { CoachBotSchedulerService } from './coach-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierBotModule, CoachMongoModule],
  providers: [CoachBotService, CoachBotSchedulerService, CoachService, TelegramBotsFactoryProvider(BOTS.COACH)],
})
export class CoachBotModule {}
