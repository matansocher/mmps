import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { getFlightsAboveCountry, handleListSubscriptions, handleSubscribe, handleUnsubscribe } from './utils';

const chatId = MY_USER_ID;

const schema = z.object({
  action: z.enum(['check', 'subscribe', 'unsubscribe', 'list']).describe('The action to perform'),
  countryName: z.string().optional().describe('Country name in English - required for check, subscribe, and unsubscribe'),
});

async function runner({ action, countryName }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'check': {
        if (!countryName) return JSON.stringify({ success: false, error: 'Country name is required for check action' });
        const result = await getFlightsAboveCountry(countryName);
        return JSON.stringify({
          success: true,
          country: { name: result.country.name, emoji: result.country.emoji },
          flightCount: result.flightCount,
          topOriginCountries: getTopOriginCountries(result.flights.map((f) => f.originCountry)),
        });
      }

      case 'subscribe':
        return handleSubscribe(chatId, countryName);

      case 'unsubscribe':
        return handleUnsubscribe(chatId, countryName);

      case 'list':
        return handleListSubscriptions(chatId);

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${err.message}` });
  }
}

function getTopOriginCountries(originCountries: string[]): { country: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const country of originCountries) {
    counts.set(country, (counts.get(country) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }));
}

export const flightsTool = tool(runner, {
  name: 'flights_tracker',
  description: `Track live flights above any country using real-time data from OpenSky Network.

Actions:
- check: Get the current number of flights flying above a specific country right now. Returns flight count and top origin countries.
- subscribe: Subscribe to hourly flight count updates for a country. You'll receive updates every hour showing how many flights are above each subscribed country.
- unsubscribe: Unsubscribe from flight updates for a country.
- list: List all active flight subscriptions.

When users ask about flights over a country, air traffic, planes flying above a location, or want to track airspace activity, use this tool.

Examples:
- "How many flights are over Israel right now?" -> check with countryName "Israel"
- "Track flights above Iran" -> subscribe with countryName "Iran"
- "Subscribe to flight updates for Germany" -> subscribe with countryName "Germany"
- "Stop tracking flights over France" -> unsubscribe with countryName "France"
- "Show my flight subscriptions" -> list`,
  schema,
});
