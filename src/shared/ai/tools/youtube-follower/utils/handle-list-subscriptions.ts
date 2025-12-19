import { getActiveSubscriptions } from '@shared/youtube-follower';

export async function handleListSubscriptions(): Promise<string> {
  try {
    const subscriptions = await getActiveSubscriptions();

    if (subscriptions.length === 0) {
      return JSON.stringify({
        success: true,
        message: 'No active YouTube subscriptions',
        subscriptions: [],
      });
    }

    const subscriptionsList = subscriptions.map((sub) => ({
      channelName: sub.channelName,
      channelHandle: sub.channelHandle,
      channelUrl: sub.channelUrl,
      subscribedSince: sub.createdAt.toISOString(),
    }));

    return JSON.stringify({
      success: true,
      message: `Found ${subscriptions.length} active subscription(s)`,
      subscriptions: subscriptionsList,
    });
  } catch (err) {
    return JSON.stringify({
      success: false,
      error: `Failed to list subscriptions: ${err.message}`,
    });
  }
}
