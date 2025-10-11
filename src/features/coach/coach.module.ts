import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from '@shared/coach';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { BOT_CONFIG } from './coach.config';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierModule],
  providers: [CoachController, CoachBotSchedulerService, CoachService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class CoachModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
