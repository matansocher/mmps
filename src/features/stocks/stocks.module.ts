import { Module, OnModuleInit } from '@nestjs/common';
import { createMongoConnection } from '@core/mongo';
import { NotifierModule } from '@core/notifier';
import { TelegramBotsFactoryProvider } from '@services/telegram';
import { DB_NAME } from '@shared/stocks/mongo';
import { StocksBotSchedulerService } from './stocks-scheduler.service';
import { BOT_CONFIG } from './stocks.config';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

@Module({
  imports: [NotifierModule],
  providers: [StocksController, StocksBotSchedulerService, StocksService, TelegramBotsFactoryProvider(BOT_CONFIG)],
})
export class StocksModule implements OnModuleInit {
  async onModuleInit() {
    await createMongoConnection(DB_NAME);
  }
}
