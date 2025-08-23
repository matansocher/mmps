import { z } from 'zod';
import { getStockDetailsBySymbol, StockDetails } from '@services/alpha-vantage';
import { ToolExecutionContext, ToolInstance } from '../../types';
import { stocksConfig } from './config';

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
