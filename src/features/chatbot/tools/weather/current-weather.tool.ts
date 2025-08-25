import { z } from 'zod';
import { getCurrentWeather, WeatherDetails } from '@services/open-weather-map';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const currentWeatherConfig: ToolConfig = {
  name: 'current_weather',
  description: 'Get current weather information for a specific location',
  schema: z.object({
    location: z.string().describe('The city or location to get current weather for'),
  }),
  keywords: ['weather', 'current', 'now', 'today', 'temperature', 'right now', 'at the moment'],
  instructions: 'Use this tool when users ask for current weather conditions without specifying a future date. Perfect for questions like "What\'s the weather like now?" or "Current weather in NYC".',
};

export class CurrentWeatherTool implements ToolInstance {
  getName(): string {
    return currentWeatherConfig.name;
  }

  getDescription(): string {
    return currentWeatherConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return currentWeatherConfig.schema;
  }

  getKeywords(): string[] {
    return currentWeatherConfig.keywords;
  }

  getInstructions(): string {
    return currentWeatherConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<WeatherDetails> {
    const { location } = context.parameters;
    if (!location) {
      throw new Error('Location parameter is required');
    }

    try {
      return await getCurrentWeather(location);
    } catch (error) {
      throw new Error(`Failed to fetch current weather data: ${error.message}`);
    }
  }
}
