import { Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { TelegramClientService } from './telegram-client.service';

@Module({
  imports: [LoggerModule.forChild(TelegramClientModule.name), UtilsModule],
  providers: [TelegramClientService],
  exports: [TelegramClientService],
})
export class TelegramClientModule {}
