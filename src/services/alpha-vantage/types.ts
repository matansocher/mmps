export type StockDetails = {
  readonly symbol: string;
  readonly open: string;
  readonly high: string;
  readonly low: string;
  readonly price: string;
  readonly volume: string;
  readonly latestTradingDay: string;
  readonly previousClose: string;
  readonly change: string;
  readonly changePercent: string;
};

export type HistoricalStockData = {
  readonly symbol: string;
  readonly date: string;
  readonly open: string;
  readonly high: string;
  readonly low: string;
  readonly close: string;
  readonly volume: string;
};

export type CryptoDetails = {
  readonly fromCurrency: string;
  readonly fromCurrencyName: string;
  readonly toCurrency: string;
  readonly toCurrencyName: string;
  readonly exchangeRate: string;
  readonly lastRefreshed: string;
  readonly timezone: string;
  readonly bidPrice: string;
  readonly askPrice: string;
};

export type HistoricalCryptoData = {
  readonly fromSymbol: string;
  readonly toSymbol: string;
  readonly date: string;
  readonly open: string;
  readonly high: string;
  readonly low: string;
  readonly close: string;
  readonly volume: string;
  readonly marketCap?: string;
};
