import { Module } from '@nestjs/common';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { BOT_CONFIG } from './announcer.config';
import { AnnouncerController } from './announcer.controller';

@Module({
  providers: [AnnouncerController, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class AnnouncerModule {}
