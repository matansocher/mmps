import { LoggerModule } from '@core/logger/logger.module';
import { Global, Module } from '@nestjs/common';
import { UtilsModule } from '@services/utils/utils.module';
import { TelegramBotsFactoryService } from '@services/telegram/telegram-bots-factory.service';
import { TelegramGeneralService } from '@services/telegram/telegram-general.service';

@Global()
@Module({
  imports: [UtilsModule, LoggerModule],
  providers: [TelegramGeneralService, TelegramBotsFactoryService],
  exports: [TelegramGeneralService, TelegramBotsFactoryService],
})
export class TelegramModule {}
