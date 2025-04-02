import { Module } from '@nestjs/common';
import { WoltModule } from '@features/wolt';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { AnnouncerController } from './announcer.controller';

@Module({
  imports: [WoltModule],
  providers: [AnnouncerController, TelegramBotsFactoryProvider(BOTS.ANNOUNCER)],
})
export class AnnouncerModule {}
