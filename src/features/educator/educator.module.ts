import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EducatorMongoModule } from '@core/mongo/educator-mongo';
import { NotifierModule } from '@core/notifier';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { EducatorSchedulerService } from './educator-scheduler.service';
import { EducatorController } from './educator.controller';
import { EducatorService } from './educator.service';

@Module({
  imports: [NotifierModule, OpenaiModule, EducatorMongoModule, NotifierModule, ScheduleModule.forRoot()],
  providers: [EducatorController, EducatorSchedulerService, EducatorService, TelegramBotsFactoryProvider(BOTS.EDUCATOR)],
  exports: [TelegramBotsFactoryProvider(BOTS.EDUCATOR)],
})
export class EducatorModule {}
