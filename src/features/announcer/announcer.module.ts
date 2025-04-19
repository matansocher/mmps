import { Module } from '@nestjs/common';
import { WoltModule } from '@features/wolt';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { BOT_CONFIG } from './announcer.config';
import { AnnouncerController } from './announcer.controller';

@Module({
  imports: [WoltModule],
  providers: [AnnouncerController, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class AnnouncerModule {}
