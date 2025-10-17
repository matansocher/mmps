export type StockDetail = {
  readonly symbol: string;
  readonly shortName: string;
  readonly longName: string;
  readonly currency: string;
  readonly exchange: string;
  readonly marketState: string;
  readonly regularMarketPrice: number;
  readonly regularMarketChange: number;
  readonly regularMarketChangePercent: number;
  readonly regularMarketDayHigh: number;
  readonly regularMarketDayLow: number;
  readonly regularMarketVolume: number;
  readonly marketCap: number;
  readonly fiftyDayAverage: number;
  readonly twoHundredDayAverage: number;
  readonly fiftyTwoWeekRange: {
    readonly low: number;
    readonly high: number;
  };
  readonly fiftyTwoWeekChangePercent: number;
  readonly dividendRate?: number;
  readonly dividendYield?: number;
  readonly trailingPE?: number;
  readonly forwardPE?: number;
  readonly earningsTimestamp?: string;
  readonly earningsTimestampStart?: string;
  readonly earningsTimestampEnd?: string;
  readonly averageAnalystRating?: string;
  readonly exchangeTimezoneName: string;
  readonly exchangeTimezoneShortName: string;
  readonly regularMarketPreviousClose: number;
  readonly regularMarketOpen: number;
  readonly tradeable: boolean;
};

export type StockSearchResult = {
  readonly symbol: string;
  readonly shortName: string;
  readonly longName: string;
  readonly exchange: string;
  readonly quoteType: string;
  readonly exchangeDisplayName: string;
  readonly typeDisplayName: string;
  readonly score: number;
};
