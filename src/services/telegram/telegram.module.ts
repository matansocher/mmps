import { LoggerModule } from '@core/logger/logger.module';
import { Global, Module } from '@nestjs/common';
import { TelegramBotsFactoryService } from '@services/telegram/telegram-bots-factory.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';
import { MessageLoaderService } from '@services/telegram/message-loader.service';
import { MessagesAggregatorService } from '@services/telegram/messages-aggregator.service';
import { UtilsModule } from '@services/utils/utils.module';

@Global()
@Module({
  imports: [UtilsModule, LoggerModule],
  providers: [TelegramGeneralService, TelegramBotsFactoryService, MessageLoaderService, MessagesAggregatorService],
  exports: [TelegramGeneralService, TelegramBotsFactoryService, MessageLoaderService, MessagesAggregatorService],
})
export class TelegramModule {}
