import type { Quote, StockSearchResult } from '../interface';

export function parseStockSearchResults(quote: Quote): StockSearchResult {
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
