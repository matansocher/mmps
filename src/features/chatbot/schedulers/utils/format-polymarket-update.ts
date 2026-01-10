import { buildPolymarketUrl } from '@services/polymarket';
import type { MarketSummary } from '@services/polymarket';
import type { Subscription } from '@shared/polymarket-follower';

export type MarketUpdate = {
  readonly subscription: Subscription;
  readonly market: MarketSummary;
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
