import { getActiveSubscriptionsByChatId, getSubscription, removeSubscription } from '@shared/spotify-follower';

export async function handleUnsubscribe(chatId: number, showIdentifier: string): Promise<string> {
  if (!showIdentifier) {
    return JSON.stringify({ success: false, error: 'showId or podcast name is required for unsubscribe action' });
  }

  try {
    // Try to find by exact show id first
    let subscription = await getSubscription(showIdentifier, chatId);

    // If not found by id, fuzzy match by name
    if (!subscription) {
      const subscriptions = await getActiveSubscriptionsByChatId(chatId);
      subscription = subscriptions.find((sub) => sub.showName.toLowerCase().includes(showIdentifier.toLowerCase())) || null;
    }

    if (!subscription) {
      return JSON.stringify({ success: false, error: `Not subscribed to any podcast matching "${showIdentifier}"` });
    }

    const result = await removeSubscription(subscription.showId, chatId);

    if (result.modifiedCount === 0) {
      return JSON.stringify({ success: false, error: `Failed to unsubscribe from "${subscription.showName}"` });
    }

    return JSON.stringify({ success: true, message: `Successfully unsubscribed from "${subscription.showName}"` });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to unsubscribe: ${err.message}` });
  }
}
