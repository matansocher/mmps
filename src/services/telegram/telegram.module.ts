import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { MessageLoaderService } from './message-loader.service';
import { MessagesAggregatorService } from './messages-aggregator.service';
import { TelegramGeneralService } from './telegram-general.service';
import { UtilsModule } from '@core/utils';

@Global()
@Module({
  imports: [LoggerModule.forChild(TelegramModule.name), UtilsModule],
  providers: [TelegramGeneralService, MessageLoaderService, MessagesAggregatorService],
  exports: [TelegramGeneralService, MessageLoaderService, MessagesAggregatorService],
})
export class TelegramModule {}
