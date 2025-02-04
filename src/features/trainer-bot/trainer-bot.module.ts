import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TrainerMongoModule } from '@core/mongo/trainer-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { TrainerBotService } from './trainer-bot.service';
import { TrainerSchedulerService } from './trainer-scheduler.service';
import { TrainerService } from './trainer.service';

@Module({
  imports: [NotifierBotModule, TrainerMongoModule, NotifierBotModule, ScheduleModule.forRoot()],
  providers: [TrainerBotService, TrainerSchedulerService, TrainerService, TelegramBotsFactoryProvider(BOTS.TRAINER)],
})
export class TrainerBotModule {}
