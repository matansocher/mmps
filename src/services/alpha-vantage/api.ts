import axios from 'axios';
import { env } from 'node:process';
import { StockDetails, HistoricalStockData, CryptoDetails, HistoricalCryptoData } from '@services/alpha-vantage/types';

const baseURL = 'https://www.alphavantage.co/query';

function parseStockDetails(rawDetails): StockDetails {
  return {
    symbol: rawDetails['01. symbol'],
    open: rawDetails['02. open'],
    high: rawDetails['03. high'],
    low: rawDetails['04. low'],
    price: rawDetails['05. price'],
    volume: rawDetails['06. volume'],
    latestTradingDay: rawDetails['07. latest trading day'],
    previousClose: rawDetails['08. previous close'],
    change: rawDetails['09. change'],
    changePercent: rawDetails['10. change percent'],
  };
}

function parseCryptoDetails(rawDetails): CryptoDetails {
  return {
    fromCurrency: rawDetails['1. From_Currency Code'],
    fromCurrencyName: rawDetails['2. From_Currency Name'],
    toCurrency: rawDetails['3. To_Currency Code'],
    toCurrencyName: rawDetails['4. To_Currency Name'],
    exchangeRate: rawDetails['5. Exchange Rate'],
    lastRefreshed: rawDetails['6. Last Refreshed'],
    timezone: rawDetails['7. Time Zone'],
    bidPrice: rawDetails['8. Bid Price'],
    askPrice: rawDetails['9. Ask Price'],
  };
}

function getApiKey(): string {
  const apiKey = env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('Alpha Vantage API key not configured');
  }
  return apiKey;
}

export async function getStockDetailsBySymbol(symbol: string): Promise<StockDetails> {
  const apikey = getApiKey();
  const response = await axios.get(baseURL, {
    params: {
      function: 'GLOBAL_QUOTE',
      symbol,
      apikey,
    },
  });

  const rawDetails = response?.data['Global Quote'];
  if (!rawDetails) {
    throw new Error('No stock details found');
  }
  return parseStockDetails(rawDetails);
}

export async function getHistoricalStockData(symbol: string, date?: string): Promise<HistoricalStockData | HistoricalStockData[]> {
  const apikey = getApiKey();
  const response = await axios.get(baseURL, {
    params: {
      function: 'TIME_SERIES_DAILY',
      symbol,
      apikey,
      outputsize: 'full', // Get full historical data
    },
  });

  const timeSeries = response?.data['Time Series (Daily)'];
  if (!timeSeries) {
    throw new Error('No historical stock data found');
  }

  // If a specific date is requested
  if (date) {
    const dateData = timeSeries[date];
    if (!dateData) {
      // Try to find the closest available date
      const dates = Object.keys(timeSeries).sort().reverse();
      const closestDate = dates.find(d => d <= date) || dates[0];
      const closestData = timeSeries[closestDate];
      
      return {
        symbol,
        date: closestDate,
        open: closestData['1. open'],
        high: closestData['2. high'],
        low: closestData['3. low'],
        close: closestData['4. close'],
        volume: closestData['5. volume'],
      };
    }
    
    return {
      symbol,
      date,
      open: dateData['1. open'],
      high: dateData['2. high'],
      low: dateData['3. low'],
      close: dateData['4. close'],
      volume: dateData['5. volume'],
    };
  }

  // Return recent historical data if no specific date
  const dates = Object.keys(timeSeries).sort().reverse().slice(0, 30); // Last 30 days
  return dates.map(date => ({
    symbol,
    date,
    open: timeSeries[date]['1. open'],
    high: timeSeries[date]['2. high'],
    low: timeSeries[date]['3. low'],
    close: timeSeries[date]['4. close'],
    volume: timeSeries[date]['5. volume'],
  }));
}

export async function getCryptoDetailsBySymbol(fromSymbol: string, toSymbol: string = 'USD'): Promise<CryptoDetails> {
  const apikey = getApiKey();
  const response = await axios.get(baseURL, {
    params: {
      function: 'CURRENCY_EXCHANGE_RATE',
      from_currency: fromSymbol,
      to_currency: toSymbol,
      apikey,
    },
  });

  const rawDetails = response?.data['Realtime Currency Exchange Rate'];
  if (!rawDetails) {
    throw new Error('No crypto details found');
  }
  return parseCryptoDetails(rawDetails);
}

export async function getHistoricalCryptoData(fromSymbol: string, toSymbol: string = 'USD', date?: string): Promise<HistoricalCryptoData | HistoricalCryptoData[]> {
  const apikey = getApiKey();
  const response = await axios.get(baseURL, {
    params: {
      function: 'DIGITAL_CURRENCY_DAILY',
      symbol: fromSymbol,
      market: toSymbol,
      apikey,
    },
  });

  const timeSeries = response?.data['Time Series (Digital Currency Daily)'];
  if (!timeSeries) {
    throw new Error('No historical crypto data found');
  }

  // If a specific date is requested
  if (date) {
    const dateData = timeSeries[date];
    if (!dateData) {
      // Try to find the closest available date
      const dates = Object.keys(timeSeries).sort().reverse();
      const closestDate = dates.find(d => d <= date) || dates[0];
      const closestData = timeSeries[closestDate];
      
      return {
        fromSymbol,
        toSymbol,
        date: closestDate,
        open: closestData[`1a. open (${toSymbol})`],
        high: closestData[`2a. high (${toSymbol})`],
        low: closestData[`3a. low (${toSymbol})`],
        close: closestData[`4a. close (${toSymbol})`],
        volume: closestData['5. volume'],
        marketCap: closestData[`6. market cap (${toSymbol})`],
      };
    }
    
    return {
      fromSymbol,
      toSymbol,
      date,
      open: dateData[`1a. open (${toSymbol})`],
      high: dateData[`2a. high (${toSymbol})`],
      low: dateData[`3a. low (${toSymbol})`],
      close: dateData[`4a. close (${toSymbol})`],
      volume: dateData['5. volume'],
      marketCap: dateData[`6. market cap (${toSymbol})`],
    };
  }

  // Return recent historical data if no specific date
  const dates = Object.keys(timeSeries).sort().reverse().slice(0, 30); // Last 30 days
  return dates.map(date => ({
    fromSymbol,
    toSymbol,
    date,
    open: timeSeries[date][`1a. open (${toSymbol})`],
    high: timeSeries[date][`2a. high (${toSymbol})`],
    low: timeSeries[date][`3a. low (${toSymbol})`],
    close: timeSeries[date][`4a. close (${toSymbol})`],
    volume: timeSeries[date]['5. volume'],
    marketCap: timeSeries[date][`6. market cap (${toSymbol})`],
  }));
}
