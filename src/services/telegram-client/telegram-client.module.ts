import { Module } from '@nestjs/common';
import { TelegramClientService } from './telegram-client.service';

@Module({
  providers: [TelegramClientService],
  exports: [TelegramClientService],
})
export class TelegramClientModule {}
