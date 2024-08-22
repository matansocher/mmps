import { Global, Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { MessageLoaderService } from '@services/telegram/message-loader.service';
import { MessagesAggregatorService } from '@services/telegram/messages-aggregator.service';
import { UtilsModule } from '@core/utils/utils.module';

@Global()
@Module({
  imports: [LoggerModule.forChild(TelegramModule.name), UtilsModule],
  providers: [TelegramGeneralService, MessageLoaderService, MessagesAggregatorService],
  exports: [TelegramGeneralService, MessageLoaderService, MessagesAggregatorService],
})
export class TelegramModule {}
