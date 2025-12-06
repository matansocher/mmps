import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { generateRainRadarImage } from '@services/rain-radar';

const schema = z.object({
  location: z.string().optional().describe('The location for the radar (defaults to Kfar Saba)'),
});

async function runner({ location }: z.infer<typeof schema>) {
  return generateRainRadarImage({ lat: 32.1782049, lon: 34.9123794 });
}

export const rainRadarTool = tool(runner, {
  name: 'rain_radar',
  description: 'Generate a rain radar image showing precipitation data for Kfar Saba, Israel. Shows current rain coverage on a map. Returns a local file path to the generated PNG image.',
  schema,
});
