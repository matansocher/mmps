import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from '@core/logger/logger.module';
import { NotifierBotModule } from '@core/notifier-bot/notifier-bot.module';
import { StockBuddyMongoModule } from '@core/mongo/stock-buddy-mongo/stock-buddy-mongo.module';
import { UtilsModule } from '@core/utils/utils.module';
import { BOTS } from '@services/telegram/telegram.config';
import { StockBuddyModule } from '@services/stock-buddy/stock-buddy.module';
import { TelegramBotsFactoryModule } from '@services/telegram/telegram-bots-factory/telegram-bots-factory.module';
import { TelegramModule } from '@services/telegram/telegram.module';
import { StockBuddyBotService } from './stock-buddy-bot.service';
import { StockBuddyBotUtilsService } from './stock-buddy-bot-utils.service';

@Module({
  imports: [
    LoggerModule.forChild(StockBuddyBotModule.name),
    NotifierBotModule,
    ScheduleModule.forRoot(),
    StockBuddyModule,
    StockBuddyMongoModule,
    TelegramBotsFactoryModule.forChild(BOTS.STOCK_BUDDY),
    TelegramModule,
    UtilsModule,
  ],
  providers: [StockBuddyBotService, StockBuddyBotUtilsService],
})
export class StockBuddyBotModule {}
