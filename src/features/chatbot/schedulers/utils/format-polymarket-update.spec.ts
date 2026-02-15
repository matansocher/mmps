import type { MarketSummary } from '@services/polymarket';
import type { Subscription } from '@shared/polymarket-follower';
import { formatDailyUpdateMessage, formatPriceChange } from './format-polymarket-update';
import type { MarketUpdate } from './format-polymarket-update';

const createMockMarket = (overrides: Partial<MarketSummary> = {}): MarketSummary => ({
  id: 'market-123',
  slug: 'test-market-slug',
  question: 'Will this test pass?',
  yesPrice: 0.75,
  noPrice: 0.25,
  volume24hr: 50000,
  oneDayPriceChange: 0.05,
  endDate: '2025-12-31T00:00:00.000Z',
  active: true,
  closed: false,
  polymarketUrl: 'https://polymarket.com/event/test-market-slug',
  ...overrides,
});

const createMockSubscription = (overrides: Partial<Subscription> = {}): Subscription =>
  ({
    marketId: 'market-123',
    marketSlug: 'test-market-slug',
    marketQuestion: 'Will this test pass?',
    chatId: 12345,
    lastNotifiedPrice: 0.7,
    subscribedAt: new Date('2025-01-01'),
    ...overrides,
  }) as Subscription;

describe('formatPriceChange', () => {
  describe('when API 24h change is available', () => {
    it('should return positive change with up emoji', () => {
      expect(formatPriceChange(0.05, null, 0.75)).toBe('📈 (+5.0%)');
    });

    it('should return negative change with down emoji', () => {
      expect(formatPriceChange(-0.03, null, 0.75)).toBe('📉 (-3.0%)');
    });

    it('should return zero change with arrow emoji', () => {
      expect(formatPriceChange(0, null, 0.75)).toBe('➡️ (+0.0%)');
    });

    it('should handle large positive change', () => {
      expect(formatPriceChange(0.25, null, 0.75)).toBe('📈 (+25.0%)');
    });

    it('should handle large negative change', () => {
      expect(formatPriceChange(-0.5, null, 0.25)).toBe('📉 (-50.0%)');
    });

    it('should format decimal precision correctly', () => {
      expect(formatPriceChange(0.123, null, 0.75)).toBe('📈 (+12.3%)');
    });
  });

  describe('when API 24h change is null (fallback to calculated)', () => {
    it('should calculate positive change from last notified price', () => {
      // currentPrice 0.75 - lastNotifiedPrice 0.70 = 0.05 = +5.0%
      expect(formatPriceChange(null, 0.7, 0.75)).toBe('📈 (+5.0%)');
    });

    it('should calculate negative change from last notified price', () => {
      // currentPrice 0.75 - lastNotifiedPrice 0.80 = -0.05 = -5.0%
      expect(formatPriceChange(null, 0.8, 0.75)).toBe('📉 (-5.0%)');
    });

    it('should calculate zero change when prices are equal', () => {
      expect(formatPriceChange(null, 0.75, 0.75)).toBe('➡️ (+0.0%)');
    });

    it('should handle small price differences', () => {
      // currentPrice 0.751 - lastNotifiedPrice 0.750 = 0.001 = +0.1%
      expect(formatPriceChange(null, 0.75, 0.751)).toBe('📈 (+0.1%)');
    });
  });

  describe('when no price data is available', () => {
    it('should return empty string when both values are null', () => {
      expect(formatPriceChange(null, null, 0.75)).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should prefer API change over calculated change', () => {
      // API says +5%, calculated would be +10%
      expect(formatPriceChange(0.05, 0.65, 0.75)).toBe('📈 (+5.0%)');
    });

    it('should handle price at 0', () => {
      expect(formatPriceChange(null, 0.05, 0)).toBe('📉 (-5.0%)');
    });

    it('should handle price at 1', () => {
      expect(formatPriceChange(null, 0.95, 1)).toBe('📈 (+5.0%)');
    });
  });
});

describe('formatDailyUpdateMessage', () => {
  it('should format a single market update', () => {
    const updates: MarketUpdate[] = [
      {
        subscription: createMockSubscription(),
        market: createMockMarket(),
      },
    ];

    const result = formatDailyUpdateMessage(updates);

    expect(result).toContain('*Polymarket Daily Update*');
    expect(result).toContain('🟢'); // active market
    expect(result).toContain('*Will this test pass?*');
    expect(result).toContain('Yes: 75.0%');
    expect(result).toContain('📈 (+5.0%)');
    expect(result).toContain('[View market](https://polymarket.com/event/test-market-slug)');
  });

  it('should format multiple market updates', () => {
    const updates: MarketUpdate[] = [
      {
        subscription: createMockSubscription(),
        market: createMockMarket({ question: 'First market?' }),
      },
      {
        subscription: createMockSubscription({ marketSlug: 'second-market' }),
        market: createMockMarket({ question: 'Second market?', slug: 'second-market' }),
      },
    ];

    const result = formatDailyUpdateMessage(updates);

    expect(result).toContain('First market?');
    expect(result).toContain('Second market?');
    // Markets should be separated by double newlines
    expect(result).toMatch(/First market\?[\s\S]*\n\n[\s\S]*Second market\?/);
  });

  it('should show closed emoji for closed markets', () => {
    const updates: MarketUpdate[] = [
      {
        subscription: createMockSubscription(),
        market: createMockMarket({ closed: true, active: false }),
      },
    ];

    const result = formatDailyUpdateMessage(updates);

    expect(result).toContain('🔒');
  });

  it('should show paused emoji for inactive markets', () => {
    const updates: MarketUpdate[] = [
      {
        subscription: createMockSubscription(),
        market: createMockMarket({ active: false, closed: false }),
      },
    ];

    const result = formatDailyUpdateMessage(updates);

    expect(result).toContain('⏸️');
  });

  it('should show active emoji for active markets', () => {
    const updates: MarketUpdate[] = [
      {
        subscription: createMockSubscription(),
        market: createMockMarket({ active: true, closed: false }),
      },
    ];

    const result = formatDailyUpdateMessage(updates);

    expect(result).toContain('🟢');
  });

  it('should use fallback price change when API change is null', () => {
    const updates: MarketUpdate[] = [
      {
        subscription: createMockSubscription({ lastNotifiedPrice: 0.7 }),
        market: createMockMarket({ oneDayPriceChange: null, yesPrice: 0.75 }),
      },
    ];

    const result = formatDailyUpdateMessage(updates);

    // 0.75 - 0.70 = 0.05 = +5.0%
    expect(result).toContain('📈 (+5.0%)');
  });

  it('should handle empty updates array', () => {
    const result = formatDailyUpdateMessage([]);

    expect(result).toBe('*Polymarket Daily Update*\n\n');
  });

  it('should format extreme yes price correctly', () => {
    const updates: MarketUpdate[] = [
      {
        subscription: createMockSubscription(),
        market: createMockMarket({ yesPrice: 0.99 }),
      },
    ];

    const result = formatDailyUpdateMessage(updates);

    expect(result).toContain('Yes: 99.0%');
  });

  it('should format low yes price correctly', () => {
    const updates: MarketUpdate[] = [
      {
        subscription: createMockSubscription(),
        market: createMockMarket({ yesPrice: 0.01 }),
      },
    ];

    const result = formatDailyUpdateMessage(updates);

    expect(result).toContain('Yes: 1.0%');
  });
});
