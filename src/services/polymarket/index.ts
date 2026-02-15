export { getTrendingMarkets, getMarketBySlug, getMarketById, getEventBySlug, searchEventsByTag } from './api';
export type { PolymarketMarket, MarketSummary, TrendingMarketsResponse, PolymarketEvent, EventSummary, SearchEventsResponse, EventWithMarketsResponse } from './types';
export { extractSlugFromUrl, formatMarketSummary, formatMarketForList, buildPolymarketUrl } from './utils';
