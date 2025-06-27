import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IsraelyMongoModule } from '@core/mongo/israely-mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { IsraelyBotSchedulerService } from './israely-scheduler.service';
import { BOT_CONFIG } from './israely.config';
import { IsraelyController } from './israely.controller';
import { IsraelyService } from './israely.service';

@Module({
  imports: [ScheduleModule.forRoot(), IsraelyMongoModule, NotifierModule],
  providers: [IsraelyController, IsraelyService, IsraelyBotSchedulerService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class IsraelyModule {}
