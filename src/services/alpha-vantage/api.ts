import axios from 'axios';
import { StockDetails } from '@services/alpha-vantage/types';

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

export async function getStockDetailsBySymbol(apikey: string, symbol: string): Promise<StockDetails> {
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
