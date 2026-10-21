import { buildPolymarketOddsImage, parseProbability, selectPolymarketOdds } from './polymarket-odds';

const multiEvent = {
  success: true,
  type: 'multi',
  event: { title: 'World Cup Winner', slug: 'world-cup-winner' },
  outcomes: [
    { rank: 1, outcome: 'Spain', probability: 0.18, oneDayPriceChange: 0.012 },
    { rank: 2, outcome: 'France', probability: 0.15, oneDayPriceChange: null },
  ],
};

const trending = {
  success: true,
  markets: [
    { rank: 1, question: 'Fed rate cut in December?', yesPrice: '72.5%', volume24hr: 1000 },
    { rank: 2, question: 'Bitcoin above $150k?', yesPrice: '12.0%', volume24hr: 900 },
  ],
};

describe('parseProbability()', () => {
  test.each([
    { value: 0.42, expected: 0.42 },
    { value: '72.5%', expected: 0.725 },
    { value: '61.0% Yes', expected: 0.61 },
    { value: 'n/a', expected: null },
    { value: undefined, expected: null },
  ])('should return $expected for $value', ({ value, expected }) => {
    expect(parseProbability(value)).toEqual(expected);
  });
});

describe('selectPolymarketOdds()', () => {
  test('should map multi-outcome events to outcome rows', () => {
    expect(selectPolymarketOdds([{ toolName: 'polymarket', data: multiEvent }])).toEqual({
      kind: 'event',
      card: {
        title: 'World Cup Winner',
        rows: [
          { label: 'Spain', probability: 0.18, change: 0.012 },
          { label: 'France', probability: 0.15, change: null },
        ],
      },
    });
  });

  test('should map trending markets with percent strings', () => {
    const selection = selectPolymarketOdds([{ toolName: 'polymarket', data: trending }]);
    expect(selection.kind).toEqual('trending');
    expect(selection.card.rows).toEqual([
      { label: 'Fed rate cut in December?', probability: 0.725, change: null },
      { label: 'Bitcoin above $150k?', probability: 0.12, change: null },
    ]);
  });

  test('should render a single-market event as Yes/No bars', () => {
    const data = { success: true, event: { title: 'Fed decision' }, markets: [{ question: 'Cut in December?', yesPrice: 0.7, noPrice: 0.3, oneDayPriceChange: 0.05 }] };
    expect(selectPolymarketOdds([{ toolName: 'polymarket', data }]).card).toEqual({
      title: 'Cut in December?',
      rows: [
        { label: 'Yes', probability: 0.7, change: 0.05, tone: 'yes' },
        { label: 'No', probability: 1 - 0.7, change: -0.05, tone: 'no' },
      ],
    });
  });

  test('should parse multi-outcome subscriptions', () => {
    const data = { success: true, market: { question: 'World Cup Winner', type: 'multi', topOutcomes: ['Spain 18.0%', 'Côte d’Ivoire 1.5%'] } };
    expect(selectPolymarketOdds([{ toolName: 'polymarket', data }]).card.rows).toEqual([
      { label: 'Spain', probability: 0.18, change: null },
      { label: 'Côte d’Ivoire', probability: 0.015, change: null },
    ]);
  });

  test('should use the latest result that has odds', () => {
    const list = { success: true, subscriptions: [] };
    expect(
      selectPolymarketOdds([
        { toolName: 'polymarket', data: trending },
        { toolName: 'polymarket', data: multiEvent },
        { toolName: 'polymarket', data: list },
      ]).card.title,
    ).toEqual('World Cup Winner');
  });

  test.each([
    { name: 'list results', data: { success: true, subscriptions: [{ question: 'x' }] } },
    { name: 'search results', data: { success: true, events: [{ title: 'x' }] } },
    { name: 'failed results', data: { success: false, error: 'Already subscribed', market: { question: 'x' } } },
    { name: 'empty markets', data: { success: true, markets: [] } },
  ])('should return null for $name', ({ data }) => {
    expect(selectPolymarketOdds([{ toolName: 'polymarket', data }])).toEqual(null);
  });
});

describe('buildPolymarketOddsImage()', () => {
  test('should return null when there are no odds', () => {
    expect(buildPolymarketOddsImage([{ toolName: 'polymarket', data: { success: true, events: [] } }], 'reply')).toEqual(null);
  });

  test('should render a PNG for odds results', () => {
    const image = buildPolymarketOddsImage([{ toolName: 'polymarket', data: multiEvent }], 'הסיכויים');
    expect(image.subarray(1, 4).toString()).toEqual('PNG');
  });
});
