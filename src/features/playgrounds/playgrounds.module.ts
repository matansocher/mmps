import { Module } from '@nestjs/common';
import { BOTS, TelegramBotsFactoryProvider } from '@services/telegram';
import { PlaygroundsController } from './playgrounds.controller';

@Module({
  providers: [PlaygroundsController, TelegramBotsFactoryProvider(BOTS.PLAYGROUNDS)],
})
export class PlaygroundsModule {}
