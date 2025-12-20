import { getChannelIdFromHandle } from '@services/youtube-v3';
import { getActiveSubscriptions, removeSubscription } from '@shared/youtube-follower';
import { extractChannelIdentifier } from './extract-channel-identifier';

export async function handleUnsubscribe(channelIdentifier: string): Promise<string> {
  if (!channelIdentifier) {
    return JSON.stringify({ success: false, error: 'Channel identifier is required for unsubscribe action' });
  }

  try {
    const cleanIdentifier = extractChannelIdentifier(channelIdentifier);

    let channelId: string;
    let channelName: string;
    try {
      channelId = await getChannelIdFromHandle(cleanIdentifier);
      const subscriptions = await getActiveSubscriptions();
      const matchingSubscription = subscriptions.find((sub) => sub.channelId === channelId);

      if (!matchingSubscription) {
        return JSON.stringify({ success: false, error: `Not subscribed to this channel` });
      }

      channelName = matchingSubscription.channelName;
    } catch {
      const subscriptions = await getActiveSubscriptions();
      const matchingSubscription = subscriptions.find(
        (sub) => sub.channelName.toLowerCase().includes(cleanIdentifier.toLowerCase()) || sub.channelHandle?.toLowerCase() === cleanIdentifier.toLowerCase(),
      );

      if (!matchingSubscription) {
        return JSON.stringify({ success: false, error: `Could not find subscription for "${channelIdentifier}"` });
      }

      channelId = matchingSubscription.channelId;
      channelName = matchingSubscription.channelName;
    }

    const result = await removeSubscription(channelId);

    if (result.modifiedCount === 0) {
      return JSON.stringify({ success: false, error: `Not subscribed to ${channelName}` });
    }

    return JSON.stringify({ success: true, message: `Successfully unsubscribed from ${channelName}` });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to unsubscribe: ${err.message}` });
  }
}
