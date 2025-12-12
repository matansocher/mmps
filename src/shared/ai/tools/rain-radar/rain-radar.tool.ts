import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { generateRainRadarImage } from '@services/rain-radar';

const schema = z.object({
  location: z.string().optional().describe('The location for the radar (defaults to Israel)'),
});

async function runner({ location }: z.infer<typeof schema>) {
  const locationName = location || 'Israel';
  return generateRainRadarImage({ location: locationName });
}

export const rainRadarTool = tool(runner, {
  name: 'rain_radar',
  description:
    'Generate a rain radar image from IMS (Israel Meteorological Service) showing current precipitation data for Israel overlaid on a map. Shows composite radar coverage from all IMS stations with geographic context. Returns a local file path to the generated PNG image.',
  schema,
});
