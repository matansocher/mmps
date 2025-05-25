import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CoachMongoModule } from '@core/mongo/coach-mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { CompetitionCacheService, CompetitionMatchesCacheService, CompetitionTableCacheService, MatchesSummaryCacheService } from './cache';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { BOT_CONFIG } from './coach.config';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierModule, CoachMongoModule],
  providers: [
    CoachController,
    CoachBotSchedulerService,
    CoachService,
    CompetitionCacheService,
    CompetitionMatchesCacheService,
    CompetitionTableCacheService,
    MatchesSummaryCacheService,
    TelegramBotsFactoryProvider(BOT_CONFIG),
  ],
})
export class CoachModule {}
