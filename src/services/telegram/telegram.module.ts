import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { TelegramGeneralService } from '@services/telegram';
import { MessageLoaderService } from '@services/telegram';
import { MessagesAggregatorService } from '@services/telegram';
import { UtilsModule } from '@services/utils';

@Global()
@Module({
  imports: [LoggerModule.forRoot(TelegramModule.name), UtilsModule],
  providers: [TelegramGeneralService, MessageLoaderService, MessagesAggregatorService],
  exports: [TelegramGeneralService, MessageLoaderService, MessagesAggregatorService],
})
export class TelegramModule {}
