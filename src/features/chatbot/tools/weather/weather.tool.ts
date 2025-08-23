import { z } from 'zod';
import { getWeatherDetails, WeatherDetails } from '@services/open-weather-map';
import { ToolExecutionContext, ToolInstance } from '../../types';
import { weatherConfig } from './config';

export class WeatherTool implements ToolInstance {
  getName(): string {
    return weatherConfig.name;
  }

  getDescription(): string {
    return weatherConfig.description;
  }

  getSchema(): z.ZodObject<any> {
    return weatherConfig.schema;
  }

  getKeywords(): string[] {
    return weatherConfig.keywords;
  }

  getInstructions(): string {
    return weatherConfig.instructions || '';
  }

  async execute(context: ToolExecutionContext): Promise<WeatherDetails> {
    const { location, date } = context.parameters;
    if (!location) {
      throw new Error('Location parameter is required');
    }

    try {
      return getWeatherDetails(location, date);
    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }
}
