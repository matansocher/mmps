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

  const urls = [];
  if (result.mapImageUrl) {
    urls.push(`MAP_IMAGE: ${result.mapImageUrl}`);
  }
  if (result.streetViewImageUrl) {
    urls.push(`STREET_VIEW_IMAGE: ${result.streetViewImageUrl}`);
  }

  return urls.join('\n');
}

export const googleMapsPlaceTool = tool(runner, {
  name: 'google_maps_place',
  description: 'Get Google Maps and Street View images for a specific place, landmark, or address. Returns Imgur URLs for both a map view and street-level view images of the location.',
  schema,
});
