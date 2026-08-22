export { getTrendingMarkets, getMarketBySlug, getMarketById, getEventBySlug, getEventOutcomes, searchEvents, searchEventsByTag } from './api';
export type {
  PolymarketMarket,
  MarketSummary,
  TrendingMarketsResponse,
  PolymarketEvent,
  EventSummary,
  SearchEventsResponse,
  EventWithMarketsResponse,
  EventOutcome,
  MultiOutcomeEventSummary,
} from './types';
export { extractSlugFromUrl, formatMarketSummary, formatMarketForList, buildPolymarketUrl } from './utils';
