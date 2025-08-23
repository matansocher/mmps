import { z } from 'zod';
import { ToolConfig } from '../../types';

export const weatherConfig: ToolConfig = {
  name: 'weather',
  description: 'Get current weather information for a specific location',
  schema: z.object({
    location: z.string().describe('The city or location to get weather for'),
  }),
  keywords: ['weather', 'temperature', 'forecast', 'climate', 'rain', 'sunny', 'cloudy', 'humidity'],
  instructions: 'When users ask about weather, extract the location from their request. If no location is specified, ask them to provide one.',
};
