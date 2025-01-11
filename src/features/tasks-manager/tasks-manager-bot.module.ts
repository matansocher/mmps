import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksManagerMongoModule } from '@core/mongo/tasks-manager-mongo';
import { NotifierBotModule } from '@core/notifier-bot';
import { BOTS, TelegramBotsFactoryModule, TelegramModule } from '@services/telegram';
import { TasksManagerBotService } from './tasks-manager-bot.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotifierBotModule,
    TelegramBotsFactoryModule.forChild(BOTS.TASKS_MANAGER),
    TelegramModule,
    TasksManagerMongoModule,
  ],
  providers: [TasksManagerBotService],
})
export class TasksManagerBotModule {}
