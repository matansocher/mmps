import { z } from 'zod';
import { getWeatherDetails } from '@services/open-weather-map';
import { ToolExecutionContext, ToolInstance } from '../../types';
import { weatherConfig } from './config';

interface WeatherData {
  readonly location: string;
  readonly temperature: number;
  readonly feelsLike: number;
  readonly temperatureMin: number;
  readonly temperatureMax: number;
  readonly humidity: number;
  readonly coords: {
    readonly lat: number;
    readonly lon: number;
  };
  readonly description: string;
}

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

  async execute(context: ToolExecutionContext): Promise<WeatherData> {
    const location = context.parameters.location;
    if (!location) {
      throw new Error('Location parameter is required');
    }

    try {
      return getWeatherDetails(location);
    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }
}
