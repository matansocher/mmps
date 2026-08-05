import type { EventOutcome, MarketSummary, MultiOutcomeEventSummary } from '@services/polymarket';
import type { OutcomeSnapshot, Subscription } from '@shared/polymarket-follower';
import { formatDailyUpdateMessage, formatMultiOutcomeUpdateMessage, formatOutcomeChange, formatPriceChange, toOutcomeSnapshots } from './format-polymarket-update';
import type { MarketUpdate, MultiOutcomeUpdate } from './format-polymarket-update';

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

const createMockOutcome = (overrides: Partial<EventOutcome> = {}): EventOutcome => ({
  outcome: 'France',
  probability: 0.356,
  oneDayPriceChange: 0.02,
  marketSlug: 'will-france-win-the-2026-fifa-world-cup',
  ...overrides,
});

const createMockEvent = (overrides: Partial<MultiOutcomeEventSummary> = {}): MultiOutcomeEventSummary => ({
  id: 'event-1',
  title: 'World Cup Winner',
  slug: 'world-cup-winner',
  volume24hr: 1000000,
  active: true,
  closed: false,
  negRisk: true,
  outcomes: [createMockOutcome()],
  polymarketUrl: 'https://polymarket.com/event/world-cup-winner',
  ...overrides,
});

const createMockMultiSubscription = (overrides: Partial<Subscription> = {}): Subscription =>
  ({
    marketId: 'event-1',
    marketSlug: 'world-cup-winner',
    marketQuestion: 'World Cup Winner',
    chatId: 12345,
    type: 'multi',
    lastNotifiedPrice: null,
    lastNotifiedOutcomes: null,
    ...overrides,
  }) as Subscription;

describe('formatOutcomeChange', () => {
  it('should prefer API 24h change when available', () => {
    expect(formatOutcomeChange(createMockOutcome({ oneDayPriceChange: 0.02 }), null)).toBe('📈 (+2.0%)');
  });

  it('should render negative API change', () => {
    expect(formatOutcomeChange(createMockOutcome({ oneDayPriceChange: -0.04 }), null)).toBe('📉 (-4.0%)');
  });

  it('should fall back to matching snapshot when API change is null', () => {
    const snapshots: OutcomeSnapshot[] = [{ outcome: 'France', probability: 0.3 }];
    // 0.356 - 0.30 = 0.056 => +5.6%
    expect(formatOutcomeChange(createMockOutcome({ oneDayPriceChange: null }), snapshots)).toBe('📈 (+5.6%)');
  });

  it('should return empty string when no change data is available', () => {
    expect(formatOutcomeChange(createMockOutcome({ oneDayPriceChange: null }), null)).toBe('');
  });

  it('should return empty string when snapshot has no matching outcome', () => {
    const snapshots: OutcomeSnapshot[] = [{ outcome: 'Spain', probability: 0.12 }];
    expect(formatOutcomeChange(createMockOutcome({ oneDayPriceChange: null }), snapshots)).toBe('');
  });
});

describe('toOutcomeSnapshots', () => {
  it('should map outcomes to name/probability snapshots', () => {
    const event = createMockEvent({
      outcomes: [createMockOutcome({ outcome: 'France', probability: 0.35 }), createMockOutcome({ outcome: 'Spain', probability: 0.12 })],
    });

    expect(toOutcomeSnapshots(event)).toEqual([
      { outcome: 'France', probability: 0.35 },
      { outcome: 'Spain', probability: 0.12 },
    ]);
  });

  it('should cap snapshots at the top 4 outcomes', () => {
    const outcomes = Array.from({ length: 12 }, (_, index) => createMockOutcome({ outcome: `Team ${index}`, probability: (12 - index) / 100 }));
    expect(toOutcomeSnapshots(createMockEvent({ outcomes }))).toHaveLength(4);
  });
});

describe('formatMultiOutcomeUpdateMessage', () => {
  it('should format a multi-outcome event with ranked outcomes', () => {
    const updates: MultiOutcomeUpdate[] = [
      {
        subscription: createMockMultiSubscription(),
        event: createMockEvent({
          outcomes: [createMockOutcome({ outcome: 'France', probability: 0.356, oneDayPriceChange: 0.02 }), createMockOutcome({ outcome: 'Argentina', probability: 0.168, oneDayPriceChange: -0.01 })],
        }),
      },
    ];

    const result = formatMultiOutcomeUpdateMessage(updates);

    expect(result).toContain('*Polymarket Events Update*');
    expect(result).toContain('🟢');
    expect(result).toContain('*World Cup Winner*');
    expect(result).toContain('1. France: 35.6% 📈 (+2.0%)');
    expect(result).toContain('2. Argentina: 16.8% 📉 (-1.0%)');
    expect(result).toContain('[View event](https://polymarket.com/event/world-cup-winner)');
  });

  it('should show only the top 4 outcomes', () => {
    const outcomes = Array.from({ length: 14 }, (_, index) => createMockOutcome({ outcome: `Team ${index}`, probability: (14 - index) / 100 }));
    const updates: MultiOutcomeUpdate[] = [{ subscription: createMockMultiSubscription(), event: createMockEvent({ outcomes }) }];

    const result = formatMultiOutcomeUpdateMessage(updates);

    expect(result).toContain('4. Team 3');
    expect(result).not.toContain('5. Team 4');
  });

  it('should show closed emoji for closed events', () => {
    const updates: MultiOutcomeUpdate[] = [{ subscription: createMockMultiSubscription(), event: createMockEvent({ closed: true, active: false }) }];

    expect(formatMultiOutcomeUpdateMessage(updates)).toContain('🔒');
  });
});
