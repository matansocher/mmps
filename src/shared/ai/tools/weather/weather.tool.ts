import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCurrentWeather, getForecastWeather, getTomorrowHourlyForecast } from '@services/weather-api';

const schema = z.object({
  action: z
    .enum(['current', 'forecast', 'tomorrow_hourly'])
    .describe('Action to perform: "current" for current weather, "forecast" for a specific date forecast (up to 14 days), "tomorrow_hourly" for detailed hourly forecast for tomorrow'),
  location: z.string().describe('The city or location to get weather for'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format (required for "forecast" action, must be within the next 14 days)'),
});

async function runner({ action, location, date }: z.infer<typeof schema>) {
  switch (action) {
    case 'current': {
      const weather = await getCurrentWeather(location);
      return {
        action: 'current',
        location: weather.location,
        temperature: `${weather.temperature}°C`,
        feelsLike: `${weather.feelsLike}°C`,
        condition: weather.condition,
        humidity: `${weather.humidity}%`,
        windSpeed: `${weather.windSpeed} km/h`,
        date: weather.date,
      };
    }

    case 'forecast': {
      if (!date) {
        throw new Error('Date parameter is required for forecast action');
      }
      const forecast = await getForecastWeather(location, date);
      return {
        action: 'forecast',
        location: forecast.location,
        date: forecast.date,
        temperature: `${forecast.temperature}°C`,
        temperatureMin: `${forecast.temperatureMin}°C`,
        temperatureMax: `${forecast.temperatureMax}°C`,
        condition: forecast.condition,
        humidity: `${forecast.humidity}%`,
        windSpeed: `${forecast.windSpeed} km/h`,
        chanceOfRain: `${forecast.chanceOfRain}%`,
      };
    }

    case 'tomorrow_hourly': {
      const forecast = await getTomorrowHourlyForecast(location);
      const formattedHourly = forecast.hourly.map((h) => ({
        time: `${h.hour}:00`,
        temp: `${h.temperature}°C`,
        feelsLike: `${h.feelsLike}°C`,
        condition: h.condition,
        humidity: `${h.humidity}%`,
        wind: `${h.windSpeed} km/h`,
        rainChance: `${h.chanceOfRain}%`,
      }));

      return {
        action: 'tomorrow_hourly',
        location: forecast.location,
        date: forecast.date,
        hourlyForecast: formattedHourly,
        summary: `Detailed hourly weather forecast for ${forecast.location} on ${forecast.date}. ${forecast.hourly.length} hours of data available.`,
      };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export const weatherTool = tool(runner, {
  name: 'weather',
  description:
    'Get weather information. Supports three actions: "current" for current weather, "forecast" for a specific date (up to 14 days ahead), or "tomorrow_hourly" for detailed 24-hour forecast for tomorrow.',
  schema,
});
