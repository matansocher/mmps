import { z } from 'zod';
import { ToolConfig } from '../../types';

export const stocksConfig: ToolConfig = {
  name: 'stocks',
  description: 'Get latest stock prices',
  parameters: [
    {
      name: 'symbol',
      type: 'string',
      description: 'The stock symbol, e.g., AAPL for Apple Inc.',
      required: true,
    },
  ],
  schema: z.object({
    symbol: z.string().min(1, 'Symbol cannot be empty'),
  }),
  keywords: ['stock', 'price', 'market', 'shares', 'trading', 'investment', 'finance'],
  instructions: 'When users ask for stock prices, try to extract the stock symbol or company name. If no specific stock is mentioned, ask them to provide one.',
};
