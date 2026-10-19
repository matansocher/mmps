import type { OddsCard } from '@services/polymarket';
import type { MarketUpdate, MultiOutcomeUpdate } from './format-polymarket-update';

const TOP_OUTCOMES_LIMIT = 4;

export function buildBinaryOddsCard({ subscription, market }: MarketUpdate): OddsCard {
  const change = market.oneDayPriceChange ?? (subscription.lastNotifiedPrice !== null ? market.yesPrice - subscription.lastNotifiedPrice : null);
  return {
    title: market.question,
    rows: [
      { label: 'Yes', probability: market.yesPrice, change, tone: 'yes' },
      { label: 'No', probability: market.noPrice, change: change === null ? null : -change, tone: 'no' },
    ],
  };
}

export function buildMultiOutcomeOddsCard({ subscription, event }: MultiOutcomeUpdate): OddsCard {
  const rows = event.outcomes.slice(0, TOP_OUTCOMES_LIMIT).map((outcome) => {
    const previous = subscription.lastNotifiedOutcomes?.find((snapshot) => snapshot.outcome === outcome.outcome);
    const change = outcome.oneDayPriceChange ?? (previous ? outcome.probability - previous.probability : null);
    return { label: outcome.outcome, probability: outcome.probability, change };
  });
  return { title: event.title, rows };
}

export function buildPolymarketUpdateCards(updates: readonly MarketUpdate[], multiUpdates: readonly MultiOutcomeUpdate[]): OddsCard[] {
  return [...updates.map(buildBinaryOddsCard), ...multiUpdates.map(buildMultiOutcomeOddsCard)].filter((card) => card.rows.length);
}
