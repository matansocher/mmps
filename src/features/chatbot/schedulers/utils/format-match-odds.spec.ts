import type { MultiOutcomeEventSummary } from '@services/polymarket';
import { cleanOutcomeLabel, formatMatchOdds } from './format-match-odds';

function createEvent(outcomes: MultiOutcomeEventSummary['outcomes']): MultiOutcomeEventSummary {
  return {
    id: '1',
    title: 'Borussia Dortmund vs. Bayern Munich',
    slug: 'gsc-bvb-bmu-2026-08-22',
    volume24hr: 1000,
    active: true,
    closed: false,
    negRisk: true,
    outcomes,
    polymarketUrl: 'https://polymarket.com/event/gsc-bvb-bmu-2026-08-22',
  };
}

describe('cleanOutcomeLabel()', () => {
  it('should shorten the verbose draw label', () => {
    expect(cleanOutcomeLabel('Draw (Borussia Dortmund vs. Bayern Munich)')).toEqual('Draw');
  });

  it('should leave team labels untouched', () => {
    expect(cleanOutcomeLabel('Bayern Munich')).toEqual('Bayern Munich');
  });
});

describe('formatMatchOdds()', () => {
  it('should render outcomes with the leader highlighted and a market link', () => {
    const event = createEvent([
      { outcome: 'Bayern Munich', probability: 0.595, oneDayPriceChange: 0.01, marketSlug: 'a' },
      { outcome: 'Draw (Borussia Dortmund vs. Bayern Munich)', probability: 0.215, oneDayPriceChange: null, marketSlug: 'b' },
      { outcome: 'Borussia Dortmund', probability: 0.195, oneDayPriceChange: null, marketSlug: 'c' },
    ]);

    expect(formatMatchOdds(event)).toEqual(
      ['📊 *Polymarket odds*', '🟢 Bayern Munich: 59.5%', '⚪ Draw: 21.5%', '⚪ Borussia Dortmund: 19.5%', '[View market](https://polymarket.com/event/gsc-bvb-bmu-2026-08-22)'].join('\n'),
    );
  });

  it('should return an empty string when there are no outcomes', () => {
    expect(formatMatchOdds(createEvent([]))).toEqual('');
  });
});
