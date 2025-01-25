import yahooFinance from 'yahoo-finance2';
import { Quote, StockDataSummary, StockSearchResult } from './interface';
import { parseStockDetails, parseStockSearchResults } from './utils';

export async function getStockDetailsBySymbol(symbol: string): Promise<StockDataSummary> {
  const quote = await yahooFinance.quote(symbol);
  if (!quote) {
    return null;
  }
  return parseStockDetails(quote as any); // TODO: change to real types
}

export async function getStockDetailsByName(name: string, numOfResults: number): Promise<StockSearchResult[]> {
  const searchResults = await yahooFinance.search(name);
  if (!searchResults) {
    return null;
  }
  return (searchResults.quotes as any) // TODO: change to real types
    ?.filter((searchResult: Quote) => !!searchResult.symbol)
    .slice(0, numOfResults)
    .map((quote: Quote) => parseStockSearchResults(quote));
}
