import { FactoryProvider, Module } from '@nestjs/common';
import { LoggerModule } from '@core/logger/logger.module';
import yahooFinance from 'yahoo-finance2';
import { YAHOO_FINANCE_CLIENT_TOKEN } from './yahoo-finance.config';
import { YahooFinanceService } from './yahoo-finance.service';

export const YahooFinanceClientProvider: FactoryProvider = {
  provide: YAHOO_FINANCE_CLIENT_TOKEN,
  useFactory: () => yahooFinance,
};

@Module({
  imports: [LoggerModule.forChild(YahooFinanceModule.name)],
  providers: [YahooFinanceService, YahooFinanceClientProvider],
  exports: [YahooFinanceService],
})
export class YahooFinanceModule {}
