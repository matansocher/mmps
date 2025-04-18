import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CoachMongoModule } from '@core/mongo/coach-mongo';
import { NotifierModule } from '@core/notifier';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { CompetitionMatchesCacheService, CompetitionTableCacheService, MatchesSummaryCacheService } from './cache';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierModule, CoachMongoModule],
  providers: [
    CoachController,
    CoachBotSchedulerService,
    CoachService,
    CompetitionMatchesCacheService,
    CompetitionTableCacheService,
    MatchesSummaryCacheService,
    TelegramBotsFactoryProvider(BOTS.COACH),
  ],
  exports: [TelegramBotsFactoryProvider(BOTS.COACH)],
})
export class CoachModule {}
