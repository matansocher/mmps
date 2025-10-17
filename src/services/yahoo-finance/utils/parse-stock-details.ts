import type { StockDetail } from '../interface';

export function parseStockDetail(quote: any): StockDetail {
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
    dividendRate: quote.dividendRate,
    dividendYield: quote.dividendYield,
    trailingPE: quote.trailingPE,
    forwardPE: quote.forwardPE,
    earningsTimestamp: quote.earningsTimestamp,
    earningsTimestampStart: quote.earningsTimestampStart,
    earningsTimestampEnd: quote.earningsTimestampEnd,
    averageAnalystRating: quote.averageAnalystRating,
    exchangeTimezoneName: quote.exchangeTimezoneName || '',
    exchangeTimezoneShortName: quote.exchangeTimezoneShortName || '',
    regularMarketPreviousClose: quote.regularMarketPreviousClose || 0,
    regularMarketOpen: quote.regularMarketOpen || 0,
    tradeable: quote.tradeable !== undefined ? quote.tradeable : false,
  };
}
