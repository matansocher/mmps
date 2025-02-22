import { Module } from '@nestjs/common';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { PlaygroundsBotService } from './playgrounds-bot.service';

@Module({
  providers: [PlaygroundsBotService, TelegramBotsFactoryProvider(BOTS.PLAYGROUNDS)],
})
export class PlaygroundsBotModule {}
