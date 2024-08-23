import { LoggerModule } from '@core/logger/logger.module';
import { UtilsModule } from '@core/utils/utils.module';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StockBuddyService } from '@services/stock-buddy/stock-buddy.service';
import { YahooFinanceModule } from '@services/yahoo-finance/yahoo-finance.module';

@Module({
  imports: [LoggerModule.forChild(StockBuddyModule.name), UtilsModule, ScheduleModule.forRoot(), YahooFinanceModule],
  providers: [StockBuddyService],
  exports: [StockBuddyService],
})
export class StockBuddyModule {}
