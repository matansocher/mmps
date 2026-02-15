import type { MarketSummary } from '../types';

export function formatMarketSummary(market: MarketSummary): string {
  const yesPct = (market.yesPrice * 100).toFixed(1);
  const noPct = (market.noPrice * 100).toFixed(1);
  const changeStr = market.oneDayPriceChange !== null ? `${market.oneDayPriceChange >= 0 ? '+' : ''}${(market.oneDayPriceChange * 100).toFixed(1)}%` : 'N/A';
  const volume24hrStr = formatVolume(market.volume24hr);

  return `*${market.question}*

Yes: ${yesPct}% | No: ${noPct}%
24h Change: ${changeStr}
24h Volume: $${volume24hrStr}
End Date: ${formatDate(market.endDate)}
[View on Polymarket](${market.polymarketUrl})`;
}

export function formatMarketForList(market: MarketSummary): string {
  const yesPct = (market.yesPrice * 100).toFixed(1);
  const changeStr = market.oneDayPriceChange !== null ? `(${market.oneDayPriceChange >= 0 ? '+' : ''}${(market.oneDayPriceChange * 100).toFixed(1)}%)` : '';

  return `${market.question}\n  Yes: ${yesPct}% ${changeStr}`;
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toFixed(0);
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
