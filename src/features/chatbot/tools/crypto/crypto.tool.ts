import { z } from 'zod';
import { CryptoDetails, getCryptoDetailsBySymbol, getHistoricalCryptoData, HistoricalCryptoData } from '@services/alpha-vantage';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const cryptoConfig: ToolConfig = {
  name: 'crypto',
  description: 'Get latest or historical cryptocurrency prices',
  schema: z.object({
    fromSymbol: z.string().min(1, 'From symbol cannot be empty').describe('Cryptocurrency symbol (e.g., BTC, ETH)'),
    toSymbol: z.string().default('USD').describe('Target currency symbol (default: USD)'),
    date: z.string().optional().describe('Optional date in YYYY-MM-DD format for historical data'),
  }),
  keywords: ['crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'btc', 'eth', 'coin', 'digital', 'currency', 'blockchain', 'historical', 'past'],
  instructions:
    'When users ask for cryptocurrency prices, try to extract the crypto symbol (e.g., BTC for Bitcoin, ETH for Ethereum). If they mention a specific date or ask for historical data, extract the date in YYYY-MM-DD format. If no date is provided, return the latest price. The default target currency is USD unless specified otherwise.',
};

export class CryptoTool implements ToolInstance {
  getName(): string {
    return cryptoConfig.name;
  }

  getDescription(): string {
    return cryptoConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return cryptoConfig.schema;
  }

  getKeywords(): string[] {
    return cryptoConfig.keywords;
  }

  getInstructions(): string {
    return cryptoConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<CryptoDetails | HistoricalCryptoData | HistoricalCryptoData[]> {
    const { fromSymbol, toSymbol, date } = context.parameters;
    return date ? getHistoricalCryptoData(fromSymbol, toSymbol || 'USD', date) : getCryptoDetailsBySymbol(fromSymbol, toSymbol || 'USD');
  }
}
