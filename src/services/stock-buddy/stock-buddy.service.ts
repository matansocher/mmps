import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { YahooFinanceService } from '@services/yahoo-finance/yahoo-finance.service';

@Injectable()
export class StockBuddyService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly yahooFinanceService: YahooFinanceService,
  ) {}

  async shit(symbol: string) {
    const result = await this.yahooFinanceService.getStockDetails(symbol);
    return result;
  }
}
