import { getInlineKeyboardMarkup } from '@services/telegram';
import { BOT_ACTIONS } from '../stocks.config';

export type TopStock = {
  symbol: string;
  name: string;
  category: string;
};

export const TOP_STOCKS: TopStock[] = [
  // Major Indexes
  { symbol: '^GSPC', name: 'S&P 500', category: '📊 Indexes' },
  { symbol: '^DJI', name: 'Dow Jones', category: '📊 Indexes' },
  { symbol: '^IXIC', name: 'NASDAQ', category: '📊 Indexes' },
  { symbol: '^RUT', name: 'Russell 2000', category: '📊 Indexes' },

  // Tech Giants
  { symbol: 'AAPL', name: 'Apple', category: '💻 Tech Giants' },
  { symbol: 'MSFT', name: 'Microsoft', category: '💻 Tech Giants' },
  { symbol: 'GOOGL', name: 'Google', category: '💻 Tech Giants' },
  { symbol: 'AMZN', name: 'Amazon', category: '💻 Tech Giants' },
  { symbol: 'META', name: 'Meta', category: '💻 Tech Giants' },
  { symbol: 'NVDA', name: 'Nvidia', category: '💻 Tech Giants' },
  { symbol: 'TSLA', name: 'Tesla', category: '💻 Tech Giants' },

  // Popular Stocks
  { symbol: 'NFLX', name: 'Netflix', category: '⭐ Popular' },
  { symbol: 'DIS', name: 'Disney', category: '⭐ Popular' },
  { symbol: 'BA', name: 'Boeing', category: '⭐ Popular' },
  { symbol: 'JPM', name: 'JPMorgan', category: '⭐ Popular' },
  { symbol: 'V', name: 'Visa', category: '⭐ Popular' },
  { symbol: 'WMT', name: 'Walmart', category: '⭐ Popular' },
];

export function getTopStocksKeyboard(): ReturnType<typeof getInlineKeyboardMarkup> {
  const stocksByCategory = TOP_STOCKS.reduce(
    (acc, stock) => {
      if (!acc[stock.category]) {
        acc[stock.category] = [];
      }
      acc[stock.category].push(stock);
      return acc;
    },
    {} as Record<string, TopStock[]>,
  );

  const buttons: any[] = [];
  const emptyButton = { text: ' ', callback_data: BOT_ACTIONS.EMPTY };

  Object.entries(stocksByCategory).forEach(([category, stocks]) => {
    // Add empty row before category header for spacing
    buttons.push(emptyButton, emptyButton, emptyButton);

    // Add category header as a full-width button
    buttons.push({ text: category, callback_data: BOT_ACTIONS.EMPTY });

    // Add empty row after category header for spacing
    buttons.push(emptyButton, emptyButton, emptyButton);

    // Add stock buttons in groups of 3
    for (let i = 0; i < stocks.length; i += 3) {
      const row = stocks.slice(i, i + 3).map((stock) => ({
        text: `${stock.symbol}`,
        callback_data: `${BOT_ACTIONS.SELECT_STOCK} - ${stock.symbol}`,
      }));
      buttons.push(...row);
    }
  });

  return getInlineKeyboardMarkup(buttons, 3);
}
