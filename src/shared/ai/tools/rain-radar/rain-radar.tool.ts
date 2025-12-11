import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { generateRainRadarImage } from '@services/rain-radar';
import { getCurrentWeather } from '@services/weather';

const schema = z.object({
  location: z.string().optional().describe('The location for the radar (defaults to Kfar Saba)'),
});

async function runner({ location }: z.infer<typeof schema>) {
  const locationName = location || 'Kfar Saba';
  const weather = await getCurrentWeather(locationName);
  return generateRainRadarImage({ lat: weather.coords.lat, lon: weather.coords.lon });
}

export const rainRadarTool = tool(runner, {
  name: 'rain_radar',
  description:
    'Generate a rain radar image showing current precipitation data for any location. Shows rain coverage overlaid on a map with OpenStreetMap tiles. Defaults to Kfar Saba if no location specified. Returns a local file path to the generated PNG image.',
  schema,
});
