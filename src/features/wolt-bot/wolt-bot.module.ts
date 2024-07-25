import { Module } from '@nestjs/common';
import { TelegramModule } from '@services/telegram/telegram.module';
import { WoltBotService } from './wolt-bot.service';

@Module({
  imports: [TelegramModule],
  providers: [WoltBotService],
})
export class WoltBotModule {}
