import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { createMongoConnection } from '@core/mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from './mongo';
import { TeacherSchedulerService } from './teacher-scheduler.service';
import { BOT_CONFIG } from './teacher.config';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [NotifierModule, ScheduleModule.forRoot()],
  providers: [TeacherController, TeacherSchedulerService, TeacherService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class TeacherModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
