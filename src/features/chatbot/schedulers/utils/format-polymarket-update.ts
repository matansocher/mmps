import { buildPolymarketUrl } from '@services/polymarket';
import type { EventOutcome, MarketSummary, MultiOutcomeEventSummary } from '@services/polymarket';
import type { OutcomeSnapshot, Subscription } from '@shared/polymarket-follower';

const TOP_OUTCOMES_LIMIT = 4;

export type MarketUpdate = {
  readonly subscription: Subscription;
  readonly market: MarketSummary;
};

export type MultiOutcomeUpdate = {
  readonly subscription: Subscription;
  readonly event: MultiOutcomeEventSummary;
};

export type ExpiredMarketInfo = {
  readonly question: string;
  readonly slug: string;
  readonly finalPrice: string;
};

export function formatDailyUpdateMessage(updates: MarketUpdate[]): string {
  const header = `*Polymarket Daily Update*\n\n`;

  const marketLines = updates.map(({ subscription, market }) => {
    const yesPct = (market.yesPrice * 100).toFixed(1);
    const changeStr = formatPriceChange(market.oneDayPriceChange, subscription.lastNotifiedPrice, market.yesPrice);
    const statusEmoji = market.closed ? '🔒' : market.active ? '🟢' : '⏸️';

    return `${statusEmoji} *${market.question}*
   Yes: ${yesPct}% ${changeStr}
   [View market](${buildPolymarketUrl(market.slug)})`;
  });

  return header + marketLines.join('\n\n');
}

export function formatMultiOutcomeUpdateMessage(updates: MultiOutcomeUpdate[]): string {
  const header = `*Polymarket Events Update*\n\n`;

  const eventLines = updates.map(({ subscription, event }) => {
    const statusEmoji = event.closed ? '🔒' : event.active ? '🟢' : '⏸️';
    const topOutcomes = event.outcomes.slice(0, TOP_OUTCOMES_LIMIT);

    const outcomeLines = topOutcomes.map((outcome, index) => {
      const pct = (outcome.probability * 100).toFixed(1);
      const changeStr = formatOutcomeChange(outcome, subscription.lastNotifiedOutcomes ?? null);
      return `   ${index + 1}. ${outcome.outcome}: ${pct}% ${changeStr}`.trimEnd();
    });

    return `${statusEmoji} *${event.title}*
${outcomeLines.join('\n')}
   [View event](${buildPolymarketUrl(event.slug)})`;
  });

  return header + eventLines.join('\n\n');
}

export function toOutcomeSnapshots(event: MultiOutcomeEventSummary): OutcomeSnapshot[] {
  return event.outcomes.slice(0, TOP_OUTCOMES_LIMIT).map((outcome) => ({ outcome: outcome.outcome, probability: outcome.probability }));
}

export function formatExpiredMarketsSection(expiredMarkets: ExpiredMarketInfo[]): string {
  if (expiredMarkets.length === 0) {
    return '';
  }

  const header = `\n\n*Closed Markets Removed:*\n`;
  const lines = expiredMarkets.map(({ question, finalPrice, slug }) => `   ${question} (Final: ${finalPrice}) - [View](${buildPolymarketUrl(slug)})`);

  return header + lines.join('\n');
}

export function formatPriceChange(oneDayPriceChange: number | null, lastNotifiedPrice: number | null, currentPrice: number): string {
  // Prefer API's 24h change if available
  if (oneDayPriceChange !== null) {
    const changePercent = (oneDayPriceChange * 100).toFixed(1);
    const emoji = oneDayPriceChange > 0 ? '📈' : oneDayPriceChange < 0 ? '📉' : '➡️';
    return `${emoji} (${oneDayPriceChange >= 0 ? '+' : ''}${changePercent}%)`;
  }

  // Fallback: calculate from last notified price
  if (lastNotifiedPrice !== null) {
    const change = currentPrice - lastNotifiedPrice;
    const changePercent = (change * 100).toFixed(1);
    const emoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
    return `${emoji} (${change >= 0 ? '+' : ''}${changePercent}%)`;
  }

  return '';
}

export function formatOutcomeChange(outcome: EventOutcome, lastNotifiedOutcomes: OutcomeSnapshot[] | null): string {
  // Prefer API's 24h change if available
  if (outcome.oneDayPriceChange !== null) {
    return renderChange(outcome.oneDayPriceChange);
  }

  // Fallback: calculate from last notified snapshot for this outcome
  const previous = lastNotifiedOutcomes?.find((snapshot) => snapshot.outcome === outcome.outcome);
  if (previous) {
    return renderChange(outcome.probability - previous.probability);
  }

  return '';
}

function renderChange(change: number): string {
  const changePercent = (change * 100).toFixed(1);
  const emoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
  return `${emoji} (${change >= 0 ? '+' : ''}${changePercent}%)`;
}
