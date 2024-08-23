import { Injectable } from '@nestjs/common';
import { LoggerService } from '@core/logger/logger.service';
import { UtilsService } from '@core/utils/utils.service';
import { Quote, StockDataSummary, StockSearchResult } from '@services/stock-buddy/interface';
import { YahooFinanceService } from '@services/yahoo-finance/yahoo-finance.service';

@Injectable()
export class StockBuddyService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly yahooFinanceService: YahooFinanceService,
  ) {}

  async getStockDetails(searchTerm: string): Promise<StockDataSummary[]> {
    const stockDetailsBySymbol = await this.yahooFinanceService.getStockDetailsBySymbol(searchTerm);
    if (stockDetailsBySymbol) {
      return [stockDetailsBySymbol];
    }
    const results = await this.yahooFinanceService.getStockDetailsByName(searchTerm, 3);
    const promises = results.map((result: StockSearchResult) => {
      return this.yahooFinanceService.getStockDetailsBySymbol(result.symbol);
    });
    const stocksDetails = await Promise.all(promises);
    return stocksDetails.sort((stockDetailsA: StockDataSummary, stockDetailsB: StockDataSummary) => {
      const stockDetailsByNameA = results.find((result: StockSearchResult) => result.symbol === stockDetailsA.symbol);
      const stockDetailsByNameB = results.find((result: StockSearchResult) => result.symbol === stockDetailsB.symbol);
      return stockDetailsByNameB.score - stockDetailsByNameA.score;
    });
  }
}
