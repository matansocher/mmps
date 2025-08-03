import { Module } from '@nestjs/common';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { TelegramClientModule } from '@services/telegram-client';
import { TracksCacheService } from './cache';
import { BOT_CONFIG } from './tracker.config';
import { TrackerController } from './tracker.controller';

@Module({
  imports: [TelegramClientModule],
  providers: [TrackerController, TracksCacheService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class TrackerModule {}
