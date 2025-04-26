import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TrainerMongoModule } from '@core/mongo/trainer-mongo';
import { NotifierModule } from '@core/notifier';
import { OpenaiModule } from '@services/openai';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { TrainerSchedulerService } from './trainer-scheduler.service';
import { BOT_CONFIG } from './trainer.config';
import { TrainerBotService } from './trainer.controller';
import { TrainerService } from './trainer.service';

@Module({
  imports: [NotifierModule, TrainerMongoModule, NotifierModule, OpenaiModule, ScheduleModule.forRoot()],
  providers: [TrainerBotService, TrainerSchedulerService, TrainerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class TrainerModule {}
