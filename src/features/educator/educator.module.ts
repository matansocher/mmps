import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EducatorMongoModule } from '@core/mongo/educator-mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { EducatorSchedulerService } from './educator-scheduler.service';
import { BOT_CONFIG } from './educator.config';
import { EducatorController } from './educator.controller';
import { EducatorService } from './educator.service';

@Module({
  imports: [NotifierModule, EducatorMongoModule, ScheduleModule.forRoot()],
  providers: [EducatorController, EducatorSchedulerService, EducatorService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class EducatorModule {}
