import type { DataInterface } from '../interface';
import { parseStockDetails } from './parse-stock-details';

describe('parseStockDetails', () => {
  const createMockQuote = (overrides: Partial<DataInterface> = {}): DataInterface => ({
    symbol: 'AAPL',
    shortName: 'Apple Inc.',
    longName: 'Apple Inc.',
    currency: 'USD',
    exchange: 'NMS',
    marketState: 'REGULAR',
    regularMarketPrice: 185.5,
    regularMarketChange: 2.5,
    regularMarketChangePercent: 1.37,
    regularMarketDayHigh: 186.0,
    regularMarketDayLow: 183.0,
    regularMarketVolume: 50000000,
    marketCap: 2900000000000,
    fiftyDayAverage: 180.0,
    twoHundredDayAverage: 175.0,
    fiftyTwoWeekLow: 150.0,
    fiftyTwoWeekHigh: 200.0,
    fiftyTwoWeekChangePercent: 15.5,
    esgPopulated: true,
    gmtOffSetMilliseconds: -14400000,
    exchangeTimezoneName: 'America/New_York',
    exchangeTimezoneShortName: 'EDT',
    regularMarketPreviousClose: 183.0,
    regularMarketOpen: 184.0,
    tradeable: true,
    ...overrides,
  });

  it('should parse complete stock data correctly', () => {
    const quote = createMockQuote();
    const result = parseStockDetails(quote);

    expect(result.symbol).toBe('AAPL');
    expect(result.shortName).toBe('Apple Inc.');
    expect(result.longName).toBe('Apple Inc.');
    expect(result.currency).toBe('USD');
    expect(result.exchange).toBe('NMS');
    expect(result.marketState).toBe('REGULAR');
  });

  it('should parse market price data correctly', () => {
    const quote = createMockQuote();
    const result = parseStockDetails(quote);

    expect(result.regularMarketPrice).toBe(185.5);
    expect(result.regularMarketChange).toBe(2.5);
    expect(result.regularMarketChangePercent).toBe(1.37);
    expect(result.regularMarketDayHigh).toBe(186.0);
    expect(result.regularMarketDayLow).toBe(183.0);
    expect(result.regularMarketVolume).toBe(50000000);
  });

  it('should parse 52-week range correctly', () => {
    const quote = createMockQuote();
    const result = parseStockDetails(quote);

    expect(result.fiftyTwoWeekRange.low).toBe(150.0);
    expect(result.fiftyTwoWeekRange.high).toBe(200.0);
    expect(result.fiftyTwoWeekChangePercent).toBe(15.5);
  });

  it('should parse moving averages correctly', () => {
    const quote = createMockQuote();
    const result = parseStockDetails(quote);

    expect(result.fiftyDayAverage).toBe(180.0);
    expect(result.twoHundredDayAverage).toBe(175.0);
  });

  it('should parse market cap correctly', () => {
    const quote = createMockQuote();
    const result = parseStockDetails(quote);

    expect(result.marketCap).toBe(2900000000000);
  });

  it('should parse timezone info correctly', () => {
    const quote = createMockQuote();
    const result = parseStockDetails(quote);

    expect(result.exchangeTimezoneName).toBe('America/New_York');
    expect(result.exchangeTimezoneShortName).toBe('EDT');
    expect(result.gmtOffsetMilliseconds).toBe(-14400000);
  });

  it('should parse previous close and open correctly', () => {
    const quote = createMockQuote();
    const result = parseStockDetails(quote);

    expect(result.regularMarketPreviousClose).toBe(183.0);
    expect(result.regularMarketOpen).toBe(184.0);
  });

  it('should parse ESG and tradeable flags correctly', () => {
    const quote = createMockQuote();
    const result = parseStockDetails(quote);

    expect(result.esgPopulated).toBe(true);
    expect(result.tradeable).toBe(true);
  });

  describe('handling missing/undefined values', () => {
    it('should default symbol to empty string when undefined', () => {
      const quote = createMockQuote({ symbol: undefined });
      const result = parseStockDetails(quote);

      expect(result.symbol).toBe('');
    });

    it('should default shortName to empty string when undefined', () => {
      const quote = createMockQuote({ shortName: undefined });
      const result = parseStockDetails(quote);

      expect(result.shortName).toBe('');
    });

    it('should default numeric values to 0 when undefined', () => {
      const quote: DataInterface = {};
      const result = parseStockDetails(quote);

      expect(result.regularMarketPrice).toBe(0);
      expect(result.regularMarketChange).toBe(0);
      expect(result.regularMarketChangePercent).toBe(0);
      expect(result.regularMarketDayHigh).toBe(0);
      expect(result.regularMarketDayLow).toBe(0);
      expect(result.regularMarketVolume).toBe(0);
      expect(result.marketCap).toBe(0);
    });

    it('should default 52-week range to 0 when undefined', () => {
      const quote: DataInterface = {};
      const result = parseStockDetails(quote);

      expect(result.fiftyTwoWeekRange.low).toBe(0);
      expect(result.fiftyTwoWeekRange.high).toBe(0);
    });

    it('should default esgPopulated to false when undefined', () => {
      const quote: DataInterface = {};
      const result = parseStockDetails(quote);

      expect(result.esgPopulated).toBe(false);
    });

    it('should default tradeable to false when undefined', () => {
      const quote: DataInterface = {};
      const result = parseStockDetails(quote);

      expect(result.tradeable).toBe(false);
    });

    it('should handle tradeable being explicitly false', () => {
      const quote = createMockQuote({ tradeable: false });
      const result = parseStockDetails(quote);

      expect(result.tradeable).toBe(false);
    });
  });

  it('should handle negative market change', () => {
    const quote = createMockQuote({
      regularMarketChange: -5.0,
      regularMarketChangePercent: -2.7,
    });
    const result = parseStockDetails(quote);

    expect(result.regularMarketChange).toBe(-5.0);
    expect(result.regularMarketChangePercent).toBe(-2.7);
  });

  it('should handle different market states', () => {
    const preMarketQuote = createMockQuote({ marketState: 'PRE' });
    const postMarketQuote = createMockQuote({ marketState: 'POST' });
    const closedQuote = createMockQuote({ marketState: 'CLOSED' });

    expect(parseStockDetails(preMarketQuote).marketState).toBe('PRE');
    expect(parseStockDetails(postMarketQuote).marketState).toBe('POST');
    expect(parseStockDetails(closedQuote).marketState).toBe('CLOSED');
  });
});
