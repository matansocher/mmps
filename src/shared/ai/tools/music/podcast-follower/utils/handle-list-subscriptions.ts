import { getActiveSubscriptionsByChatId } from '@shared/spotify-follower';

export async function handleListSubscriptions(chatId: number): Promise<string> {
  try {
    const subscriptions = await getActiveSubscriptionsByChatId(chatId);

    if (subscriptions.length === 0) {
      return JSON.stringify({ success: true, message: 'No active podcast subscriptions', subscriptions: [] });
    }

    const subscriptionsList = subscriptions.map(({ showId, showName, createdAt }) => ({
      showId,
      name: showName,
      subscribedSince: createdAt.toISOString(),
    }));

    return JSON.stringify({
      success: true,
      message: `Found ${subscriptions.length} active podcast subscription(s)`,
      subscriptions: subscriptionsList,
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to list subscriptions: ${err.message}` });
  }
}
