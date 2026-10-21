import type { MarketSummary, MultiOutcomeEventSummary } from '@services/polymarket';
import type { Subscription } from '@shared/polymarket-follower';
import { buildBinaryOddsCard, buildMultiOutcomeOddsCard, buildPolymarketUpdateCards } from './polymarket-odds-cards';

const subscription = (overrides: Partial<Subscription> = {}): Subscription =>
  ({
    marketId: 'm1',
    marketSlug: 's',
    marketQuestion: 'q',
    chatId: 1,
    type: 'binary',
    lastNotifiedPrice: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as Subscription;

const market = (overrides: Partial<MarketSummary> = {}): MarketSummary =>
  ({
    id: 'm1',
    slug: 's',
    question: 'Will it rain?',
    yesPrice: 0.6,
    noPrice: 0.4,
    volume24hr: 1,
    oneDayPriceChange: null,
    endDate: '',
    active: true,
    closed: false,
    polymarketUrl: '',
    ...overrides,
  }) as MarketSummary;

const event = (outcomes: MultiOutcomeEventSummary['outcomes']): MultiOutcomeEventSummary => ({
  id: 'e1',
  title: 'World Cup Winner',
  slug: 'wc',
  volume24hr: 1,
  active: true,
  closed: false,
  negRisk: true,
  outcomes,
  polymarketUrl: '',
});

describe('buildBinaryOddsCard()', () => {
  test.each([
    { name: 'API 24h change', apiChange: 0.05, lastNotifiedPrice: 0.1, expected: 0.05 },
    { name: 'last notified price fallback', apiChange: null, lastNotifiedPrice: 0.5, expected: 0.6 - 0.5 },
    { name: 'no history', apiChange: null, lastNotifiedPrice: null, expected: null },
  ])('should use $name', ({ apiChange, lastNotifiedPrice, expected }) => {
    const card = buildBinaryOddsCard({ subscription: subscription({ lastNotifiedPrice }), market: market({ oneDayPriceChange: apiChange }) });
    expect(card).toEqual({
      title: 'Will it rain?',
      rows: [
        { label: 'Yes', probability: 0.6, change: expected, tone: 'yes' },
        { label: 'No', probability: 0.4, change: expected === null ? null : -expected, tone: 'no' },
      ],
    });
  });
});

describe('buildMultiOutcomeOddsCard()', () => {
  test('should keep the top 4 outcomes and fall back to snapshots for the change', () => {
    const outcomes = ['A', 'B', 'C', 'D', 'E'].map((outcome, index) => ({ outcome, probability: 0.3 - index * 0.05, oneDayPriceChange: index === 0 ? 0.02 : null, marketSlug: outcome }));
    const card = buildMultiOutcomeOddsCard({ subscription: subscription({ type: 'multi', lastNotifiedOutcomes: [{ outcome: 'B', probability: 0.2 }] }), event: event(outcomes) });
    expect(card.title).toEqual('World Cup Winner');
    expect(card.rows.map(({ label, change }) => ({ label, change }))).toEqual([
      { label: 'A', change: 0.02 },
      { label: 'B', change: 0.25 - 0.2 },
      { label: 'C', change: null },
      { label: 'D', change: null },
    ]);
  });
});

describe('buildPolymarketUpdateCards()', () => {
  test('should put binary cards first and drop events without outcomes', () => {
    const cards = buildPolymarketUpdateCards([{ subscription: subscription(), market: market() }], [{ subscription: subscription({ type: 'multi' }), event: event([]) }]);
    expect(cards.map((card) => card.title)).toEqual(['Will it rain?']);
  });
});
