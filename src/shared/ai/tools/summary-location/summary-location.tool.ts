import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getSummaryLocation, saveSummaryLocation } from '@shared/summary-location';

const schema = z.object({
  action: z.enum(['get', 'set']).describe('"get" to show the city used by the nightly summary weather, "set" to change it'),
  location: z.string().optional().describe('City name in English, e.g. "Kyoto" or "Kfar Saba" (required for set)'),
});

async function runner({ action, location }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'get':
        return JSON.stringify({ success: true, location: await getSummaryLocation() });
      case 'set': {
        const city = location?.trim();
        if (!city) return JSON.stringify({ success: false, error: 'location is required for set' });
        await saveSummaryLocation(city);
        return JSON.stringify({ success: true, location: city });
      }
      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action} summary location: ${err.message}` });
  }
}

export const summaryLocationTool = tool(runner, {
  name: 'summary_location',
  description: `Get or change the city used for the weather section of the user's nightly summary (sent at 23:00).

Actions:
- get: Show the current city.
- set: Save a new city (location). Use when the user says they are in / moved to / travelling to a city, or asks to change the nightly or summary weather city (e.g. "I'm in Kyoto now", "back to Kfar Saba").

Pass the city name in English. This does not affect regular weather questions — use the weather tool for those. After set, confirm briefly, e.g. "🌤 Nightly weather will use Kyoto."`,
  schema,
});
