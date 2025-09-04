import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getCurrentWeather } from '@services/open-weather-map';

const schema = z.object({
  location: z.string().describe('The city or location to get current weather for'),
});

async function runner({ location }: z.infer<typeof schema>) {
  return await getCurrentWeather(location);
}

export const currentWeatherTool = tool(runner, {
  name: 'current_weather',
  description: 'Get current weather information for a specific location',
  schema,
});
