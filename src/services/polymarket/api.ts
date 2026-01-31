import type {
  EventSummary,
  EventWithMarketsResponse,
  MarketSummary,
  PolymarketEvent,
  PolymarketEventWithMarkets,
  PolymarketMarket,
  SearchEventsResponse,
  TrendingMarketsResponse,
} from './types';
import { buildPolymarketUrl, parseOutcomePrices } from './utils';

const BASE_URL = 'https://gamma-api.polymarket.com/markets';
const EVENTS_URL = 'https://gamma-api.polymarket.com/events';

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

export async function getEventBySlug(slug: string): Promise<EventWithMarketsResponse> {
  const url = `${EVENTS_URL}/slug/${slug}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Event not found: ${response.status}`);
  }

  const event = (await response.json()) as PolymarketEventWithMarkets;

  return {
    event: toEventSummary(event),
    markets: (event.markets || []).map(toMarketSummary),
    fetchedAt: new Date().toISOString(),
  };
}

export async function searchEventsByTag(keyword: string, limit: number = 10): Promise<SearchEventsResponse> {
  const params = new URLSearchParams({
    tag_slug: keyword.toLowerCase(),
    active: 'true',
    closed: 'false',
    limit: limit.toString(),
    order: 'volume24hr',
    ascending: 'false',
  });

  const url = `${EVENTS_URL}?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to search events: ${response.status}`);
  }

  const events = (await response.json()) as PolymarketEvent[];

  return {
    events: events.map(toEventSummary),
    keyword,
    fetchedAt: new Date().toISOString(),
  };
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

function toEventSummary(event: PolymarketEvent): EventSummary {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    volume24hr: event.volume24hr,
    active: event.active,
    closed: event.closed,
    polymarketUrl: buildPolymarketUrl(event.slug),
  };
}
