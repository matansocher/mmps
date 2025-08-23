import { z } from 'zod';
import { ToolConfig } from '../../types';

export const weatherConfig: ToolConfig = {
  name: 'weather',
  description: 'Get weather information for a specific location and optionally a specific date (up to 5 days in the future)',
  schema: z.object({
    location: z.string().describe('The city or location to get weather for'),
    date: z.string().optional().describe('Optional date in YYYY-MM-DD format. If not provided, returns current weather. Future dates up to 5 days supported.'),
  }),
  keywords: ['weather', 'temperature', 'forecast', 'climate', 'rain', 'sunny', 'cloudy', 'humidity', 'tomorrow', 'yesterday', 'next week'],
  instructions: 'When users ask about weather, extract the location and date if specified. Support natural language dates like "tomorrow", "next Monday", etc. For historical data beyond current capabilities, inform users of limitations.',
};
