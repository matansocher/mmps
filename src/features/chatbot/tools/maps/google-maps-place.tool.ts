import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getMapImages } from './utils';

const schema = z.object({
  placeName: z.string().describe('The name of the place, landmark, or address to get maps for'),
});

async function runner({ placeName }: z.infer<typeof schema>) {
  const result = await getMapImages(placeName);

  if (!result.success) {
    throw new Error(result.error || 'Failed to generate map images');
  }
  return result.mapImageUrl;
}

export const googleMapsPlaceTool = tool(runner, {
  name: 'google_maps_place',
  description: 'Get a Google Maps image for a specific place, landmark, or address. Returns an Imgur URL for the map view of the location.',
  schema,
});
