import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getPlaceDetails, searchPlaces } from '@services/google-places';

const schema = z.object({
  action: z.enum(['search', 'details']).describe('search: find places by free text; details: get full details (phone, website, opening hours) for a placeId'),
  query: z.string().optional().describe('Free-text search, required for search. Include the city or area, e.g. "Gaston Petah Tikva" or "sushi near Dizengoff Tel Aviv"'),
  placeId: z.string().optional().describe('Google place id from a previous search result, required for details'),
  maxResults: z.number().int().min(1).max(20).optional().describe('Max search results to return (default 5)'),
  languageCode: z.string().optional().describe('Language for names and addresses, e.g. "he" or "en". Match the language of the user request'),
});

async function runner({ action, query, placeId, maxResults, languageCode }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'search': {
        if (!query) return JSON.stringify({ success: false, error: 'query is required for search' });
        const places = await searchPlaces(query, { maxResults, languageCode });
        if (!places.length) return JSON.stringify({ success: true, places: [], message: `No places found for "${query}"` });
        return JSON.stringify({ success: true, places });
      }

      case 'details': {
        if (!placeId) return JSON.stringify({ success: false, error: 'placeId is required for details' });
        const place = await getPlaceDetails(placeId, languageCode);
        return JSON.stringify({ success: true, place });
      }

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Google Places request failed: ${err instanceof Error ? err.message : String(err)}` });
  }
}

export const placesTool = tool(runner, {
  name: 'google_places',
  description: `Look up real-world places (businesses, restaurants, venues, addresses) with Google Places: exact address, coordinates, rating, Google Maps link, and via details also phone, website and opening hours.
Use it whenever the user asks where something is, wants a place's address/phone/hours, or needs a location for another action (e.g. setting a calendar event location).
- Always put the city/area in the query ("Gaston Petah Tikva"), taking it from the user's message or the related calendar event.
- If several results plausibly match and it matters which one, list them briefly and ask the user to pick; if one clearly matches, use it.
- When using a result as a calendar event location, pass "<name>, <address>".
- Include the Google Maps link when replying with a place.`,
  schema,
});
