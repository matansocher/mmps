import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TrainerMongoModule } from '@core/mongo/trainer-mongo';
import { NotifierModule } from '@core/notifier';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { TrainerSchedulerService } from './trainer-scheduler.service';
import { TrainerBotService } from './trainer.controller';
import { TrainerService } from './trainer.service';

@Module({
  imports: [NotifierModule, TrainerMongoModule, NotifierModule, OpenaiModule, ScheduleModule.forRoot()],
  providers: [TrainerBotService, TrainerSchedulerService, TrainerService, TelegramBotsFactoryProvider(BOTS.TRAINER)],
  exports: [TelegramBotsFactoryProvider(BOTS.TRAINER)],
})
export class TrainerModule {}
