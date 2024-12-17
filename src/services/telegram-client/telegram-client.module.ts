import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { Module } from '@nestjs/common';
import { TelegramClientService } from './telegram-client.service';

@Module({
  imports: [LoggerModule.forChild(TelegramClientModule.name), UtilsModule],
  providers: [TelegramClientService],
  exports: [TelegramClientService],
})
export class TelegramClientModule {}
