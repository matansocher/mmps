import { z } from 'zod';
import { getStockDetailsBySymbol, StockDetails } from '@services/alpha-vantage';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const stocksConfig: ToolConfig = {
  name: 'stocks',
  description: 'Get latest stock prices',
  schema: z.object({
    symbol: z.string().min(1, 'Symbol cannot be empty'),
  }),
  keywords: ['stock', 'price', 'market', 'shares', 'trading', 'investment', 'finance'],
  instructions: 'When users ask for stock prices, try to extract the stock symbol or company name. If no specific stock is mentioned, ask them to provide one.',
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

  async execute(context: ToolExecutionContext): Promise<StockDetails> {
    const { symbol } = context.parameters;

    try {
      return getStockDetailsBySymbol(symbol);
    } catch (error) {
      throw new Error(`Failed to fetch news: ${error.message}`);
    }
  }
}
