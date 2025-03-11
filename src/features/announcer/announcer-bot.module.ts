import { Module } from '@nestjs/common';
import { WoltBotModule } from '@features/wolt-bot';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { AnnouncerBotService } from './announcer-bot.service';

@Module({
  imports: [WoltBotModule],
  providers: [AnnouncerBotService, TelegramBotsFactoryProvider(BOTS.ANNOUNCER)],
})
export class AnnouncerBotModule {}
