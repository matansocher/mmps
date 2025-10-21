import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getHistoricalStockData, getStockDetailsBySymbol } from '@services/alpha-vantage';

const schema = z.object({
  symbol: z.string().min(1, 'Symbol cannot be empty'),
  date: z.string().optional().describe('Optional date in YYYY-MM-DD format for historical data'),
});

async function runner({ symbol, date }: z.infer<typeof schema>) {
  return date ? getHistoricalStockData(symbol, date) : getStockDetailsBySymbol(symbol);
}

export const stocksTool = tool(runner, {
  name: 'stocks',
  description: 'Get latest or historical stock prices',
  schema,
});
