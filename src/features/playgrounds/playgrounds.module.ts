import { Module } from '@nestjs/common';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { BOT_CONFIG } from './playgrounds.config';
import { PlaygroundsController } from './playgrounds.controller';

@Module({
  providers: [PlaygroundsController, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class PlaygroundsModule {}
