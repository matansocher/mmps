import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { handleListSubscriptions, handleSubscribe, handleUnsubscribe } from './utils';

const schema = z.object({
  action: z.enum(['subscribe', 'unsubscribe', 'list']).describe('The action to perform'),
  channelIdentifier: z.string().optional().describe('YouTube channel URL, handle (@username), or channel ID (UCxxxx) - required for subscribe and unsubscribe'),
});

async function runner({ action, channelIdentifier }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'subscribe':
        return handleSubscribe(channelIdentifier);

      case 'unsubscribe':
        return handleUnsubscribe(channelIdentifier);

      case 'list':
        return handleListSubscriptions();

      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${err.message}` });
  }
}

export const youtubeFollowerTool = tool(runner, {
  name: 'youtube_follower',
  description: `Manage YouTube channel subscriptions for daily video summaries. This tool allows subscribing to channels, unsubscribing, and listing active subscriptions.

Actions:
- subscribe: Subscribe to a YouTube channel using URL, handle (@username), or channel ID (UCxxxx). The system will send daily AI summaries of new videos.
- unsubscribe: Unsubscribe from a YouTube channel using the same identifier formats.
- list: List all active YouTube channel subscriptions for the user.

When users mention following/subscribing to YouTube channels or wanting video summaries, use this tool.

Examples:
- "Subscribe to @Fireship" → subscribe with channelIdentifier
- "Unsubscribe from Fireship" → unsubscribe with channel name or identifier
- "Show my YouTube subscriptions" → list`,
  schema,
});
