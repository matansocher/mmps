import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getForecastWeather } from '@services/open-weather-map';

const schema = z.object({
  location: z.string().describe('The city or location to get weather forecast for'),
  date: z.string().describe('Date in YYYY-MM-DD format. Must be within the next 5 days.'),
});

async function runner({ location, date }: z.infer<typeof schema>) {
  return await getForecastWeather(location, date);
}

export const weatherForecastTool = tool(runner, {
  name: 'weather_forecast',
  description: 'Get weather forecast for a specific location and date (up to 5 days in the future)',
  schema,
});
