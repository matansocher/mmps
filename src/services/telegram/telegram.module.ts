import { Global, Module } from '@nestjs/common';
import { MessageLoaderService } from './services/message-loader.service';
import { MessagesAggregatorService } from './services/messages-aggregator.service';
import { TelegramGeneralService } from './services/telegram-general.service';

@Global()
@Module({
  providers: [TelegramGeneralService, MessageLoaderService, MessagesAggregatorService],
  exports: [TelegramGeneralService, MessageLoaderService, MessagesAggregatorService],
})
export class TelegramModule {}
