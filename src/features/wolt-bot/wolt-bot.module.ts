import { LoggerModule } from '@core/logger/logger.module';
import { WoltMongoModule } from '@core/mongo/wolt-mongo/wolt-mongo.module';
import { WoltSchedulerService } from '@features/wolt-bot/wolt-scheduler.service';
import { Module } from '@nestjs/common';
import { TelegramModule } from '@services/telegram/telegram.module';
import { UtilsModule } from '@services/utils/utils.module';
import { WoltModule } from '@services/wolt/wolt.module';
import { WoltBotService } from './wolt-bot.service';

@Module({
  imports: [LoggerModule, UtilsModule, TelegramModule, WoltModule, WoltMongoModule],
  providers: [WoltBotService, WoltSchedulerService],
})
export class WoltBotModule {}
