import { getEventOutcomes } from './api';

function market(overrides: Record<string, unknown>) {
  return {
    id: '1',
    slug: 'slug',
    question: 'question',
    outcomePrices: '["0.5", "0.5"]',
    active: true,
    closed: false,
    ...overrides,
  };
}

function mockEventResponse(markets: Record<string, unknown>[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '10', title: 'EPL: 2027 Champion', slug: 'epl-2027-champion', negRisk: true, active: true, closed: false, volume24hr: 100, markets }),
    }),
  );
}

describe('getEventOutcomes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should exclude inactive placeholder markets', async () => {
    mockEventResponse([
      market({ groupItemTitle: 'Arsenal', outcomePrices: '["0.525", "0.475"]', slug: 'arsenal' }),
      market({ groupItemTitle: 'Liverpool', outcomePrices: '["0.105", "0.895"]', slug: 'liverpool' }),
      market({ groupItemTitle: 'Team A', active: false, slug: 'team-a' }),
      market({ groupItemTitle: 'Other', active: false, slug: 'other' }),
    ]);

    const event = await getEventOutcomes('epl-2027-champion');

    expect(event.outcomes.map(({ outcome }) => outcome)).toEqual(['Arsenal', 'Liverpool']);
  });

  it('should exclude closed markets', async () => {
    mockEventResponse([
      market({ groupItemTitle: 'Arsenal', outcomePrices: '["0.525", "0.475"]', slug: 'arsenal' }),
      market({ groupItemTitle: 'Leeds United', closed: true, outcomePrices: '["0.001", "0.999"]', slug: 'leeds' }),
    ]);

    const event = await getEventOutcomes('epl-2027-champion');

    expect(event.outcomes.map(({ outcome }) => outcome)).toEqual(['Arsenal']);
  });

  it('should sort outcomes by probability descending', async () => {
    mockEventResponse([
      market({ groupItemTitle: 'Chelsea', outcomePrices: '["0.095", "0.905"]', slug: 'chelsea' }),
      market({ groupItemTitle: 'Arsenal', outcomePrices: '["0.525", "0.475"]', slug: 'arsenal' }),
      market({ groupItemTitle: 'Manchester City', outcomePrices: '["0.195", "0.805"]', slug: 'man-city' }),
    ]);

    const event = await getEventOutcomes('epl-2027-champion');

    expect(event.outcomes.map(({ outcome }) => outcome)).toEqual(['Arsenal', 'Manchester City', 'Chelsea']);
  });
});
