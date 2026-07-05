import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { handleListSubscriptions, handleSearch, handleSubscribe, handleUnsubscribe } from './utils';

const chatId = MY_USER_ID;

const schema = z.object({
  action: z.enum(['search', 'subscribe', 'unsubscribe', 'list']).describe('The action to perform'),
  query: z.string().optional().describe('Podcast name to search for - required for the search action'),
  showId: z.string().optional().describe('Spotify show/podcast id - required for subscribe. For unsubscribe, a show id or podcast name.'),
});

async function runner({ action, query, showId }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'search':
        return handleSearch(query);

      case 'subscribe':
        return handleSubscribe(chatId, showId);

      case 'unsubscribe':
        return handleUnsubscribe(chatId, showId);

      case 'list':
        return handleListSubscriptions(chatId);

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${err.message}` });
  }
}

export const spotifyPodcastTool = tool(runner, {
  name: 'spotify_podcast',
  description: `Manage Spotify podcast (show) subscriptions and get notified when a subscribed podcast publishes a new episode.

Actions:
- search: Search Spotify podcasts by name. Returns matching shows with their showId - use it to subscribe.
- subscribe: Subscribe to a podcast by its showId. You'll be notified hourly (daytime) when a new episode is published.
- unsubscribe: Unsubscribe from a podcast by its showId or name.
- list: List all active podcast subscriptions.

When users mention following/tracking a podcast or wanting alerts for new episodes, use this tool.

Examples:
- "Notify me when Lex Fridman posts a new episode" -> search "Lex Fridman", then subscribe with the returned showId
- "Subscribe to the Joe Rogan podcast" -> search "Joe Rogan Experience" then subscribe
- "Stop following Lex Fridman podcast" -> unsubscribe with the name
- "Which podcasts am I following?" -> list`,
  schema,
});
