import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { UserPreferencesCacheService } from './cache';
import { WorldlyBotSchedulerService } from './worldly-scheduler.service';
import { BOT_CONFIG } from './worldly.config';
import { WorldlyController } from './worldly.controller';
import { WorldlyService } from './worldly.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotifierModule],
  providers: [WorldlyController, WorldlyService, WorldlyBotSchedulerService, UserPreferencesCacheService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class WorldlyModule {}
