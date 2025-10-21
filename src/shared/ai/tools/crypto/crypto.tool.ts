import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCryptoDetailsBySymbol, getHistoricalCryptoData } from '@services/alpha-vantage';

const schema = z.object({
  fromSymbol: z.string().min(1, 'From symbol cannot be empty').describe('Cryptocurrency symbol (e.g., BTC, ETH)'),
  toSymbol: z.string().default('USD').describe('Target currency symbol (default: USD)'),
  date: z.string().optional().describe('Optional date in YYYY-MM-DD format for historical data'),
});

async function runner({ fromSymbol, toSymbol, date }: z.infer<typeof schema>) {
  return date ? getHistoricalCryptoData(fromSymbol, toSymbol || 'USD', date) : getCryptoDetailsBySymbol(fromSymbol, toSymbol || 'USD');
}

export const cryptoTool = tool(runner, {
  name: 'crypto',
  description: 'Get latest or historical cryptocurrency prices',
  schema,
});
