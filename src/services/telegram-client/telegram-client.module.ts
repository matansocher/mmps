import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { TelegramClientService } from './telegram-client.service';

@Module({
  imports: [LoggerModule.forChild(TelegramClientModule.name)],
  providers: [TelegramClientService],
  exports: [TelegramClientService],
})
export class TelegramClientModule {}
