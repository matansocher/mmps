import { LoggerService } from '@core/logger/logger.service';
import { Inject, Injectable } from '@nestjs/common';
import { DataInterface, Quote, StockDataSummary, StockSearchResult } from './interface';
import { YAHOO_FINANCE_CLIENT_TOKEN } from '@services/yahoo-finance/yahoo-finance.config';

@Injectable()
export class YahooFinanceService {
  constructor(
    private readonly logger: LoggerService,
    @Inject(YAHOO_FINANCE_CLIENT_TOKEN) private readonly yahooFinance: any,
  ) {}

  async getStockDetailsBySymbol(symbol: string): Promise<StockDataSummary> {
    const quote = await this.yahooFinance.quote(symbol);
    if (!quote) {
      return null;
    }
    return this.parseStockDetails(quote);
  }

  async getStockDetailsByName(name: string, numOfResults: number): Promise<StockSearchResult[]> {
    const searchResults = await this.yahooFinance.search(name);
    if (!searchResults) {
      return null;
    }
    return searchResults.quotes
      ?.filter((searchResult: Quote) => !!searchResult.symbol)
      .slice(0, numOfResults)
      .map((quote: Quote) => this.parseStockSearchResults(quote));
  }

  parseStockDetails(quote: DataInterface): StockDataSummary {
    return {
      symbol: quote.symbol || '',
      shortName: quote.shortName || '',
      longName: quote.longName || '',
      currency: quote.currency || '',
      exchange: quote.exchange || '',
      marketState: quote.marketState || '',
      regularMarketPrice: quote.regularMarketPrice || 0,
      regularMarketChange: quote.regularMarketChange || 0,
      regularMarketChangePercent: quote.regularMarketChangePercent || 0,
      regularMarketDayHigh: quote.regularMarketDayHigh || 0,
      regularMarketDayLow: quote.regularMarketDayLow || 0,
      regularMarketVolume: quote.regularMarketVolume || 0,
      marketCap: quote.marketCap || 0,
      fiftyDayAverage: quote.fiftyDayAverage || 0,
      twoHundredDayAverage: quote.twoHundredDayAverage || 0,
      fiftyTwoWeekRange: {
        low: quote.fiftyTwoWeekLow || 0,
        high: quote.fiftyTwoWeekHigh || 0,
      },
      fiftyTwoWeekChangePercent: quote.fiftyTwoWeekChangePercent || 0,
      esgPopulated: quote.esgPopulated || false,
      gmtOffsetMilliseconds: quote.gmtOffSetMilliseconds || 0,
      exchangeTimezoneName: quote.exchangeTimezoneName || '',
      exchangeTimezoneShortName: quote.exchangeTimezoneShortName || '',
      regularMarketPreviousClose: quote.regularMarketPreviousClose || 0,
      regularMarketOpen: quote.regularMarketOpen || 0,
      tradeable: quote.tradeable !== undefined ? quote.tradeable : false,
    };
  }

  parseStockSearchResults(quote: Quote): StockSearchResult {
    return {
      symbol: quote.symbol,
      shortName: quote.shortname,
      longName: quote.longname,
      exchange: quote.exchange,
      quoteType: quote.quoteType,
      exchangeDisplayName: quote.exchDisp,
      typeDisplayName: quote.typeDisp,
      score: quote.score,
    };
  }
}
