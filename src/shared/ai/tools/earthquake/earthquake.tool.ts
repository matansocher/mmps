import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { formatEarthquake, getEarthquakesAboveMagnitude, getRecentEarthquakes, shouldNotifyAboutEarthquake } from '@services/earthquake-api';

const schema = z.object({
  action: z.enum(['recent', 'magnitude']).describe('Action to perform: "recent" for recent earthquakes, "magnitude" for earthquakes above a threshold'),
  limit: z.number().optional().default(5).describe('Maximum number of earthquakes to return (1-20)'),
  minMagnitude: z.number().optional().default(4.0).describe('Minimum magnitude threshold (e.g., 4.0, 5.0, 6.0)'),
  hoursBack: z.number().optional().default(24).describe('How many hours to look back (only for "magnitude" action)'),
});

async function runner({ action, limit, minMagnitude, hoursBack }: z.infer<typeof schema>) {
  try {
    const safeLimit = Math.max(1, Math.min(20, limit));

    let earthquakes;

    switch (action) {
      case 'recent':
        earthquakes = await getRecentEarthquakes({
          minMagnitude,
          limit: safeLimit,
          orderBy: 'time',
        });
        break;

      case 'magnitude':
        earthquakes = await getEarthquakesAboveMagnitude(minMagnitude, hoursBack);
        earthquakes = earthquakes.slice(0, safeLimit);
        break;

      default:
        return 'Invalid action. Use "recent" or "magnitude".';
    }

    const relevantEarthquakes = earthquakes.filter(shouldNotifyAboutEarthquake);

    if (relevantEarthquakes.length === 0) {
      return `No significant earthquakes found (magnitude > 6 globally OR any magnitude within 1000km of Israel) in the specified time range.`;
    }

    const formattedQuakes = relevantEarthquakes.map((quake, index) => {
      const header = `\n${'─'.repeat(50)}\n*Earthquake #${index + 1}*\n`;
      return header + formatEarthquake(quake);
    });

    const summary = `Found ${relevantEarthquakes.length} significant earthquake(s):\n`;
    return summary + formattedQuakes.join('\n');
  } catch (error) {
    return `Error fetching earthquake data: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export const earthquakeTool = tool(runner, {
  name: 'earthquake_monitor',
  description: `Get real-time earthquake information from USGS (United States Geological Survey).

Use this tool when the user asks about:
- Recent earthquakes
- Earthquakes in the last few hours/days
- Strong or significant earthquakes
- Current seismic activity
- Earthquake magnitude queries

Actions:
- "recent": Get the most recent earthquakes (default: last 10 minutes)
- "magnitude": Get earthquakes above a magnitude threshold in the last N hours

The tool returns detailed information including:
- Magnitude and location
- Date and time
- Depth and coordinates
- Tsunami warnings (if applicable)
- Alert levels
- Number of felt reports
- Link to USGS details`,
  schema,
});
