import type { MarketSummary, PolymarketMarket, TrendingMarketsResponse } from './types';
import { buildPolymarketUrl, parseOutcomePrices } from './utils';

const BASE_URL = 'https://gamma-api.polymarket.com/markets';

export async function getTrendingMarkets(limit: number = 10): Promise<TrendingMarketsResponse> {
  const params = new URLSearchParams({
    active: 'true',
    closed: 'false',
    limit: limit.toString(),
    order: 'volume24hr',
    ascending: 'false',
  });

  const url = `${BASE_URL}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch trending markets: ${response.status}`);
  }

  const markets = (await response.json()) as PolymarketMarket[];

  return {
    markets: markets.map(toMarketSummary),
    fetchedAt: new Date().toISOString(),
  };
}

export async function getMarketBySlug(slug: string): Promise<MarketSummary> {
  const url = `${BASE_URL}/slug/${slug}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Market not found: ${response.status}`);
  }

  const market = (await response.json()) as PolymarketMarket;
  return toMarketSummary(market);
}

export async function getMarketById(id: string): Promise<MarketSummary> {
  const url = `${BASE_URL}/${id}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Market not found: ${response.status}`);
  }

  const market = (await response.json()) as PolymarketMarket;
  return toMarketSummary(market);
}

function toMarketSummary(market: PolymarketMarket): MarketSummary {
  const { yesPrice, noPrice } = parseOutcomePrices(market.outcomePrices);

  return {
    id: market.id,
    slug: market.slug,
    question: market.question,
    yesPrice,
    noPrice,
    volume24hr: market.volume24hr,
    oneDayPriceChange: market.oneDayPriceChange ?? null,
    endDate: market.endDate,
    active: market.active,
    closed: market.closed,
    polymarketUrl: buildPolymarketUrl(market.slug),
  };
}
