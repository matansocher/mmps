import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from '@shared/coach';
import { CoachBotSchedulerService } from './coach-scheduler.service';
import { BOT_CONFIG } from './coach.config';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { CoachPredictionsService } from './predictions/coach-predictions.service';

@Module({
  imports: [NotifierModule],
  providers: [CoachController, CoachBotSchedulerService, CoachService, CoachPredictionsService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class CoachModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
