import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { TrainerSchedulerService } from './trainer-scheduler.service';
import { BOT_CONFIG } from './trainer.config';
import { TrainerController } from './trainer.controller';
import { TrainerService } from './trainer.service';

@Module({
  imports: [NotifierModule, ScheduleModule.forRoot()],
  providers: [TrainerController, TrainerSchedulerService, TrainerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class TrainerModule {}
