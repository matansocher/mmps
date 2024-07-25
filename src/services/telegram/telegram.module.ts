import { Module } from '@nestjs/common';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

@Module({
  providers: [TelegramGeneralService],
})
export class TelegramModule {}
