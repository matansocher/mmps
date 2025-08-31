import { z } from 'zod';
import { getHistoricalStockData, getStockDetailsBySymbol, HistoricalStockData, StockDetails } from '@services/alpha-vantage';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const stocksConfig: ToolConfig = {
  name: 'stocks',
  description: 'Get latest or historical stock prices',
  schema: z.object({
    symbol: z.string().min(1, 'Symbol cannot be empty'),
    date: z.string().optional().describe('Optional date in YYYY-MM-DD format for historical data'),
  }),
  keywords: ['stock', 'price', 'market', 'shares', 'trading', 'investment', 'finance', 'historical', 'past'],
  instructions:
    'When users ask for stock prices, try to extract the stock symbol or company name. If they mention a specific date or ask for historical data, extract the date in YYYY-MM-DD format. If no date is provided, return the latest price. If no specific stock is mentioned, ask them to provide one.',
};

export class StocksTool implements ToolInstance {
  getName(): string {
    return stocksConfig.name;
  }

  getDescription(): string {
    return stocksConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return stocksConfig.schema;
  }

  getKeywords(): string[] {
    return stocksConfig.keywords;
  }

  getInstructions(): string {
    return stocksConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<StockDetails | HistoricalStockData | HistoricalStockData[]> {
    const { symbol, date } = context.parameters;
    return date ? getHistoricalStockData(symbol, date) : getStockDetailsBySymbol(symbol);
  }
}
