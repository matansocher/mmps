import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from './mongo';
import { TrainerSchedulerService } from './trainer-scheduler.service';
import { BOT_CONFIG } from './trainer.config';
import { TrainerController } from './trainer.controller';
import { TrainerService } from './trainer.service';

@Module({
  imports: [NotifierModule, ScheduleModule.forRoot()],
  providers: [TrainerController, TrainerSchedulerService, TrainerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class TrainerModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
