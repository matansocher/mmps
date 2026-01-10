export type PolymarketMarket = {
  readonly id: string
  readonly question: string
  readonly slug: string
  readonly conditionId: string
  readonly outcomes: string // Stringified JSON array: '["Yes", "No"]'
  readonly outcomePrices: string // Stringified JSON array: '["0.65", "0.35"]'
  readonly volume: string
  readonly volume24hr: number
  readonly liquidity: string
  readonly active: boolean
  readonly closed: boolean
  readonly endDate: string // ISO date string
  readonly image?: string
  readonly description?: string
  readonly oneDayPriceChange?: number
  readonly oneWeekPriceChange?: number
  readonly oneMonthPriceChange?: number
  readonly lastTradePrice?: number
  readonly bestBid?: number
  readonly bestAsk?: number
}

export type MarketSummary = {
  readonly id: string
  readonly slug: string
  readonly question: string
  readonly yesPrice: number
  readonly noPrice: number
  readonly volume24hr: number
  readonly oneDayPriceChange: number | null
  readonly endDate: string
  readonly active: boolean
  readonly closed: boolean
  readonly polymarketUrl: string
}

export type TrendingMarketsResponse = {
  readonly markets: MarketSummary[]
  readonly fetchedAt: string
}

export type PolymarketEvent = {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly description?: string
  readonly startDate?: string
  readonly endDate?: string
  readonly image?: string
  readonly active: boolean
  readonly closed: boolean
  readonly volume24hr: number
  readonly volume: number
  readonly liquidity: number
}

export type EventSummary = {
  readonly id: string
  readonly title: string
  readonly slug: string
  readonly volume24hr: number
  readonly active: boolean
  readonly closed: boolean
  readonly polymarketUrl: string
}

export type SearchEventsResponse = {
  readonly events: EventSummary[]
  readonly keyword: string
  readonly fetchedAt: string
}
