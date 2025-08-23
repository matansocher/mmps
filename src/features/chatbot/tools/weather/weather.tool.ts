import { env } from 'node:process';
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

  getParameters(): any[] {
    return weatherConfig.parameters;
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

  extractParameters(userRequest: string): Record<string, any> {
    const location = this.extractLocationFromRequest(userRequest);
    return location ? { location } : {};
  }

  async execute(context: ToolExecutionContext): Promise<WeatherData> {
    const location = context.parameters.location;
    if (!location) {
      throw new Error('Location parameter is required');
    }

    const apiKey = env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    try {
      return getWeatherDetails(apiKey, location);
    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  private extractLocationFromRequest(request: string): string | null {
    const words = request.split(' ');
    const locationKeywords = ['in', 'at', 'for'];

    for (let i = 0; i < words.length; i++) {
      if (locationKeywords.includes(words[i].toLowerCase()) && i + 1 < words.length) {
        return words[i + 1];
      }
    }

    return null;
  }
}
