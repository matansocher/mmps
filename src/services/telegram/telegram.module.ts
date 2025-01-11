import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger';
import { UtilsModule } from '@core/utils';
import { MessageLoaderService } from './services/message-loader.service';
import { MessagesAggregatorService } from './services/messages-aggregator.service';
import { TelegramGeneralService } from './services/telegram-general.service';

@Global()
@Module({
  imports: [LoggerModule.forChild(TelegramModule.name), UtilsModule],
  providers: [TelegramGeneralService, MessageLoaderService, MessagesAggregatorService],
  exports: [TelegramGeneralService, MessageLoaderService, MessagesAggregatorService],
})
export class TelegramModule {}
