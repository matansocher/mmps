import type { Quote } from '../interface';
import { parseStockSearchResults } from './parse-stock-search-results';

describe('parseStockSearchResults', () => {
  const createMockQuote = (overrides: Partial<Quote> = {}): Quote => ({
    symbol: 'AAPL',
    shortname: 'Apple Inc.',
    longname: 'Apple Inc.',
    exchange: 'NMS',
    quoteType: 'EQUITY',
    exchDisp: 'NASDAQ',
    typeDisp: 'Equity',
    score: 1000000,
    index: 'quotes',
    isYahooFinance: true,
    ...overrides,
  });

  it('should parse quote to search result correctly', () => {
    const quote = createMockQuote();
    const result = parseStockSearchResults(quote);

    expect(result.symbol).toBe('AAPL');
    expect(result.shortName).toBe('Apple Inc.');
    expect(result.longName).toBe('Apple Inc.');
    expect(result.exchange).toBe('NMS');
    expect(result.quoteType).toBe('EQUITY');
    expect(result.exchangeDisplayName).toBe('NASDAQ');
    expect(result.typeDisplayName).toBe('Equity');
    expect(result.score).toBe(1000000);
  });

  it('should map shortname to shortName', () => {
    const quote = createMockQuote({ shortname: 'Short Name Test' });
    const result = parseStockSearchResults(quote);

    expect(result.shortName).toBe('Short Name Test');
  });

  it('should map longname to longName', () => {
    const quote = createMockQuote({ longname: 'Long Name Test Corporation' });
    const result = parseStockSearchResults(quote);

    expect(result.longName).toBe('Long Name Test Corporation');
  });

  it('should map exchDisp to exchangeDisplayName', () => {
    const quote = createMockQuote({ exchDisp: 'New York Stock Exchange' });
    const result = parseStockSearchResults(quote);

    expect(result.exchangeDisplayName).toBe('New York Stock Exchange');
  });

  it('should map typeDisp to typeDisplayName', () => {
    const quote = createMockQuote({ typeDisp: 'ETF' });
    const result = parseStockSearchResults(quote);

    expect(result.typeDisplayName).toBe('ETF');
  });

  it('should handle different quote types', () => {
    const equityQuote = createMockQuote({ quoteType: 'EQUITY' });
    const etfQuote = createMockQuote({ quoteType: 'ETF' });
    const mutualFundQuote = createMockQuote({ quoteType: 'MUTUALFUND' });
    const indexQuote = createMockQuote({ quoteType: 'INDEX' });

    expect(parseStockSearchResults(equityQuote).quoteType).toBe('EQUITY');
    expect(parseStockSearchResults(etfQuote).quoteType).toBe('ETF');
    expect(parseStockSearchResults(mutualFundQuote).quoteType).toBe('MUTUALFUND');
    expect(parseStockSearchResults(indexQuote).quoteType).toBe('INDEX');
  });

  it('should handle different exchanges', () => {
    const nasdaqQuote = createMockQuote({ exchange: 'NMS', exchDisp: 'NASDAQ' });
    const nyseQuote = createMockQuote({ exchange: 'NYQ', exchDisp: 'NYSE' });
    const londonQuote = createMockQuote({ exchange: 'LSE', exchDisp: 'London Stock Exchange' });

    expect(parseStockSearchResults(nasdaqQuote).exchange).toBe('NMS');
    expect(parseStockSearchResults(nasdaqQuote).exchangeDisplayName).toBe('NASDAQ');
    expect(parseStockSearchResults(nyseQuote).exchange).toBe('NYQ');
    expect(parseStockSearchResults(nyseQuote).exchangeDisplayName).toBe('NYSE');
    expect(parseStockSearchResults(londonQuote).exchange).toBe('LSE');
    expect(parseStockSearchResults(londonQuote).exchangeDisplayName).toBe('London Stock Exchange');
  });

  it('should preserve score value', () => {
    const highScoreQuote = createMockQuote({ score: 9999999 });
    const lowScoreQuote = createMockQuote({ score: 100 });
    const zeroScoreQuote = createMockQuote({ score: 0 });

    expect(parseStockSearchResults(highScoreQuote).score).toBe(9999999);
    expect(parseStockSearchResults(lowScoreQuote).score).toBe(100);
    expect(parseStockSearchResults(zeroScoreQuote).score).toBe(0);
  });

  it('should handle crypto quote type', () => {
    const cryptoQuote = createMockQuote({
      symbol: 'BTC-USD',
      shortname: 'Bitcoin USD',
      longname: 'Bitcoin USD',
      quoteType: 'CRYPTOCURRENCY',
      exchange: 'CCC',
      exchDisp: 'CCC',
      typeDisp: 'Cryptocurrency',
    });
    const result = parseStockSearchResults(cryptoQuote);

    expect(result.symbol).toBe('BTC-USD');
    expect(result.quoteType).toBe('CRYPTOCURRENCY');
    expect(result.typeDisplayName).toBe('Cryptocurrency');
  });

  it('should handle index quote type', () => {
    const indexQuote = createMockQuote({
      symbol: '^GSPC',
      shortname: 'S&P 500',
      longname: 'S&P 500',
      quoteType: 'INDEX',
      exchange: 'SNP',
      exchDisp: 'SNP',
      typeDisp: 'Index',
    });
    const result = parseStockSearchResults(indexQuote);

    expect(result.symbol).toBe('^GSPC');
    expect(result.quoteType).toBe('INDEX');
    expect(result.typeDisplayName).toBe('Index');
  });

  it('should handle foreign stocks', () => {
    const foreignQuote = createMockQuote({
      symbol: 'TM',
      shortname: 'Toyota Motor Corp',
      longname: 'Toyota Motor Corporation',
      exchange: 'NYQ',
      exchDisp: 'NYSE',
    });
    const result = parseStockSearchResults(foreignQuote);

    expect(result.symbol).toBe('TM');
    expect(result.shortName).toBe('Toyota Motor Corp');
    expect(result.longName).toBe('Toyota Motor Corporation');
  });
});
