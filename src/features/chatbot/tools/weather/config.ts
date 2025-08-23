import { ToolConfig } from '../../types';

export const weatherConfig: ToolConfig = {
  name: 'weather',
  description: 'Get current weather information for a specific location',
  parameters: [
    {
      name: 'location',
      type: 'string',
      required: true,
      description: 'The city or location to get weather for',
    },
  ],
  keywords: ['weather', 'temperature', 'forecast', 'climate', 'rain', 'sunny', 'cloudy', 'humidity', 'wind'],
  instructions: 'When users ask about weather, extract the location from their request. If no location is specified, ask them to provide one.',
};
