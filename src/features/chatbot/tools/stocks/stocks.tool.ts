import { env } from 'node:process';
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

  getParameters(): any[] {
    return stocksConfig.parameters;
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

  extractParameters(userRequest: string): Record<string, any> {
    const query = this.extractStockSymbolFromRequest(userRequest);
    return query ? { query } : {};
  }

  async execute(context: ToolExecutionContext): Promise<StockDetails> {
    const { symbol } = context.parameters;

    const apiKey = env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('News API key not configured');
    }

    try {
      return getStockDetailsBySymbol(apiKey, symbol);
    } catch (error) {
      throw new Error(`Failed to fetch news: ${error.message}`);
    }
  }

  private extractStockSymbolFromRequest(request: string): string | null {
    const regex = /\b[A-Z]{1,5}\b/;
    const match = request.match(regex);
    return match ? match[0] : null;
  }
}
