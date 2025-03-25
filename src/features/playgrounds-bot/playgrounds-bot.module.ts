import { Module } from '@nestjs/common';
import { OpenaiModule } from '@services/openai';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { PlaygroundsBotService } from './playgrounds-bot.service';

@Module({
  imports: [OpenaiModule],
  providers: [PlaygroundsBotService, TelegramBotsFactoryProvider(BOTS.PLAYGROUNDS)],
})
export class PlaygroundsBotModule {}
