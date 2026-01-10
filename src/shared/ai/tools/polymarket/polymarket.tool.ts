import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { handleListSubscriptions, handleSubscribe, handleTrending, handleUnsubscribe } from './utils';

const chatId = MY_USER_ID;

const schema = z.object({
  action: z.enum(['subscribe', 'unsubscribe', 'list', 'trending']).describe('The action to perform'),
  marketIdentifier: z.string().optional().describe('Polymarket URL or market slug - required for subscribe and unsubscribe'),
});

async function runner({ action, marketIdentifier }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'subscribe':
        return handleSubscribe(chatId, marketIdentifier);

      case 'unsubscribe':
        return handleUnsubscribe(chatId, marketIdentifier);

      case 'list':
        return handleListSubscriptions(chatId);

      case 'trending':
        return handleTrending();

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${err.message}` });
  }
}

export const polymarketTool = tool(runner, {
  name: 'polymarket',
  description: `Manage Polymarket prediction market subscriptions and view trending markets. This tool allows subscribing to markets for daily price updates, unsubscribing, listing active subscriptions, and viewing trending markets.

Actions:
- subscribe: Subscribe to a Polymarket prediction market using URL or slug. You'll receive daily updates at 16:00 with current prices and 24h changes.
- unsubscribe: Unsubscribe from a market using URL, slug, or market name.
- list: List all active Polymarket subscriptions.
- trending: Show top 10 trending markets by 24-hour trading volume.

When users mention following/tracking prediction markets, betting odds, or want market updates, use this tool.

Examples:
- "Subscribe to the Fed rate decision market" -> subscribe with marketIdentifier
- "Track polymarket.com/event/fed-decision-in-january" -> subscribe with URL
- "Unsubscribe from Fed market" -> unsubscribe with market name
- "Show my Polymarket subscriptions" -> list
- "What's trending on Polymarket?" -> trending`,
  schema,
});
