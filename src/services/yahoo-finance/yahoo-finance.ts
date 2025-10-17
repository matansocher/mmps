import yahooFinance from 'yahoo-finance2';
import type { StockDetail, StockSearchResult } from './interface';
import { parseStockDetail, parseStockSearchResult } from './utils';

export async function searchStocks(searchQuery: string, limit: number = 10): Promise<StockSearchResult[]> {
  const searchResults = await yahooFinance.search(searchQuery);

  if (!searchResults?.quotes) {
    return [];
  }

  return searchResults.quotes
    .filter((quote): quote is any => 'symbol' in quote && !!quote.symbol)
    .slice(0, limit)
    .map(parseStockSearchResult);
}

export async function getStockDetails(symbol: string): Promise<StockDetail | null> {
  const quote = await yahooFinance.quote(symbol);

  if (!quote) {
    return null;
  }

  return parseStockDetail(quote);
}
