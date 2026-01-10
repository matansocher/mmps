export { getTrendingMarkets, getMarketBySlug, getMarketById, searchEventsByTag } from './api'
export type { PolymarketMarket, MarketSummary, TrendingMarketsResponse, PolymarketEvent, EventSummary, SearchEventsResponse } from './types'
export { extractSlugFromUrl, formatMarketSummary, formatMarketForList, buildPolymarketUrl } from './utils'
