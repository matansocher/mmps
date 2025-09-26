import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { addChannel, getChannel, getFollowedChannels, removeChannel } from '@shared/tiktok';

const name = 'tiktok_subscription';
const description = 'Manage TikTok channel subscriptions - follow, unfollow, or list followed channels.';

const schema = z.object({
  action: z.enum(['follow', 'unfollow', 'list']).describe('The action to perform - follow a channel, unfollow a channel, or list all followed channels'),
  username: z.string().optional().describe('The TikTok username to follow or unfollow (required for follow/unfollow actions)'),
});

async function func({ action, username }: z.infer<typeof schema>) {
  try {
    switch (action) {
      case 'follow': {
        if (!username) {
          return 'Please provide a username to follow.';
        }

        const sanitizedUsername = username.replace(/[@#]/g, '').trim();

        const existingSubscription = await getChannel(sanitizedUsername);
        if (existingSubscription) {
          return `You are already subscribed to @${sanitizedUsername}`;
        }

        await addChannel(sanitizedUsername);
        return `✅ Successfully subscribed to @${sanitizedUsername}\n\nYou will now receive daily summaries of new videos from this TikTok channel.`;
      }

      case 'unfollow': {
        if (!username) {
          return 'Please provide a username to unfollow.';
        }

        const sanitizedUsername = username.replace(/[@#]/g, '').trim();

        const existingSubscription = await getChannel(sanitizedUsername);
        if (!existingSubscription) {
          return `You are not subscribed to @${sanitizedUsername}`;
        }

        await removeChannel(sanitizedUsername);
        return `✅ Successfully unsubscribed from @${sanitizedUsername}`;
      }

      case 'list': {
        const channels = await getFollowedChannels();

        if (!channels.length) {
          return 'You are not subscribed to any TikTok channels. Use the search tool to find channels to follow.';
        }

        const channelList = channels.map((channel, index) => `${index + 1}. @${channel.username}`).join('\n');

        return `📱 Your TikTok Subscriptions (${channels.length}):\n\n${channelList}\n\nYou receive daily summaries for these channels at 8 PM.`;
      }

      default:
        return 'Invalid action. Please use "follow", "unfollow", or "list".';
    }
  } catch (error) {
    console.error('Error managing TikTok subscription:', error);
    return `Error managing subscription: ${error.message}`;
  }
}

export const tiktokSubscriptionTool = new DynamicStructuredTool({
  name,
  description,
  schema,
  func,
});
