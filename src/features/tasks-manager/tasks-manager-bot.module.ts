import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger';
import { TasksManagerMongoModule } from '@core/mongo/tasks-manager-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { UtilsModule } from '@core/utils';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { TasksManagerBotService } from './tasks-manager-bot.service';

@Module({
  imports: [
    LoggerModule.forChild(TasksManagerBotModule.name),
    UtilsModule,
    ScheduleModule.forRoot(),
    NotifierBotModule,
    TelegramBotsFactoryModule.forChild(BOTS.TASKS_MANAGER),
    TelegramModule,
    TasksManagerMongoModule,
  ],
  providers: [TasksManagerBotService],
})
export class TasksManagerBotModule {}
