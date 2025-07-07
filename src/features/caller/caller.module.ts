import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CallerMongoModule } from '@core/mongo/caller-mongo';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { CallerSchedulerService } from './caller-scheduler.service';
import { BOT_CONFIG } from './caller.config';
import { CallerController } from './caller.controller';

@Module({
  imports: [ScheduleModule.forRoot(), CallerMongoModule],
  controllers: [CallerController],
  providers: [CallerSchedulerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class CallerModule {}
