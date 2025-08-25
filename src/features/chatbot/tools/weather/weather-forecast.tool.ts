import { z } from 'zod';
import { getForecastWeather, WeatherDetails } from '@services/open-weather-map';
import { ToolConfig, ToolExecutionContext, ToolInstance } from '../../types';

export const weatherForecastConfig: ToolConfig = {
  name: 'weather_forecast',
  description: 'Get weather forecast for a specific location and date (up to 5 days in the future)',
  schema: z.object({
    location: z.string().describe('The city or location to get weather forecast for'),
    date: z.string().describe('Date in YYYY-MM-DD format. Must be within the next 5 days.'),
  }),
  keywords: ['forecast', 'tomorrow', 'next', 'future', 'will be', 'going to be', 'later', 'upcoming', 'this week'],
  instructions:
    'Use this tool when users ask for weather on a specific future date. Supports up to 5 days ahead. Perfect for questions like "What will the weather be tomorrow?" or "Weather forecast for Friday".',
};

export class WeatherForecastTool implements ToolInstance {
  getName(): string {
    return weatherForecastConfig.name;
  }

  getDescription(): string {
    return weatherForecastConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return weatherForecastConfig.schema;
  }

  getKeywords(): string[] {
    return weatherForecastConfig.keywords;
  }

  getInstructions(): string {
    return weatherForecastConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<WeatherDetails> {
    const { location, date } = context.parameters;
    if (!location) {
      throw new Error('Location parameter is required');
    }
    if (!date) {
      throw new Error('Date parameter is required for weather forecast');
    }

    try {
      return await getForecastWeather(location, date);
    } catch (error) {
      throw new Error(`Failed to fetch weather forecast data: ${error.message}`);
    }
  }
}
