import axios from 'axios';
import { env } from 'node:process';
import { ToolExecutionContext } from '../../types';
import { weatherConfig } from './config';

export interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
}

export class WeatherTool {
  getName(): string {
    return weatherConfig.name;
  }

  getDescription(): string {
    return weatherConfig.description;
  }

  getParameters(): any[] {
    return weatherConfig.parameters;
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
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          q: location,
          appid: apiKey,
          units: 'metric',
        },
      });

      const data = response.data;

      return {
        location: `${data.name}, ${data.sys.country}`,
        temperature: Math.round(data.main.temp),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
      };
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
