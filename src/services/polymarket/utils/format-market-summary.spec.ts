import type { MarketSummary } from '../types';
import { formatMarketForList, formatMarketSummary } from './format-market-summary';

const createMockMarket = (overrides: Partial<MarketSummary> = {}): MarketSummary => ({
  id: 'test-id',
  slug: 'test-market',
  question: 'Will this test pass?',
  yesPrice: 0.75,
  noPrice: 0.25,
  volume24hr: 50000,
  oneDayPriceChange: 0.05,
  endDate: '2025-12-31T00:00:00.000Z',
  active: true,
  closed: false,
  polymarketUrl: 'https://polymarket.com/event/test-market',
  ...overrides,
});

describe('formatMarketSummary', () => {
  it('should format a standard market summary', () => {
    const market = createMockMarket();
    const result = formatMarketSummary(market);

    expect(result).toContain('*Will this test pass?*');
    expect(result).toContain('Yes: 75.0%');
    expect(result).toContain('No: 25.0%');
    expect(result).toContain('24h Change: +5.0%');
    expect(result).toContain('24h Volume: $50.0K');
    expect(result).toContain('[View on Polymarket](https://polymarket.com/event/test-market)');
  });

  it('should format negative price change', () => {
    const market = createMockMarket({ oneDayPriceChange: -0.03 });
    const result = formatMarketSummary(market);

    expect(result).toContain('24h Change: -3.0%');
  });

  it('should format zero price change', () => {
    const market = createMockMarket({ oneDayPriceChange: 0 });
    const result = formatMarketSummary(market);

    expect(result).toContain('24h Change: +0.0%');
  });

  it('should handle null price change', () => {
    const market = createMockMarket({ oneDayPriceChange: null });
    const result = formatMarketSummary(market);

    expect(result).toContain('24h Change: N/A');
  });

  it('should format volume in millions', () => {
    const market = createMockMarket({ volume24hr: 2500000 });
    const result = formatMarketSummary(market);

    expect(result).toContain('24h Volume: $2.50M');
  });

  it('should format volume in thousands', () => {
    const market = createMockMarket({ volume24hr: 1500 });
    const result = formatMarketSummary(market);

    expect(result).toContain('24h Volume: $1.5K');
  });

  it('should format small volume without suffix', () => {
    const market = createMockMarket({ volume24hr: 500 });
    const result = formatMarketSummary(market);

    expect(result).toContain('24h Volume: $500');
  });

  it('should format the end date correctly', () => {
    const market = createMockMarket({ endDate: '2025-06-15T00:00:00.000Z' });
    const result = formatMarketSummary(market);

    expect(result).toContain('End Date: Jun 15, 2025');
  });

  it('should handle extreme yes price', () => {
    const market = createMockMarket({ yesPrice: 0.99, noPrice: 0.01 });
    const result = formatMarketSummary(market);

    expect(result).toContain('Yes: 99.0%');
    expect(result).toContain('No: 1.0%');
  });

  it('should handle low yes price', () => {
    const market = createMockMarket({ yesPrice: 0.05, noPrice: 0.95 });
    const result = formatMarketSummary(market);

    expect(result).toContain('Yes: 5.0%');
    expect(result).toContain('No: 95.0%');
  });
});

describe('formatMarketForList', () => {
  it('should format market for list with price change', () => {
    const market = createMockMarket();
    const result = formatMarketForList(market);

    expect(result).toContain('Will this test pass?');
    expect(result).toContain('Yes: 75.0%');
    expect(result).toContain('(+5.0%)');
  });

  it('should format market with negative price change', () => {
    const market = createMockMarket({ oneDayPriceChange: -0.1 });
    const result = formatMarketForList(market);

    expect(result).toContain('(-10.0%)');
  });

  it('should omit price change when null', () => {
    const market = createMockMarket({ oneDayPriceChange: null });
    const result = formatMarketForList(market);

    expect(result).toBe('Will this test pass?\n  Yes: 75.0% ');
  });

  it('should format 50/50 market', () => {
    const market = createMockMarket({ yesPrice: 0.5, noPrice: 0.5, oneDayPriceChange: 0 });
    const result = formatMarketForList(market);

    expect(result).toContain('Yes: 50.0%');
    expect(result).toContain('(+0.0%)');
  });
});
