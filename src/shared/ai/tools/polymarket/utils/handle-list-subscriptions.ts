import { buildPolymarketUrl } from '@services/polymarket';
import { getActiveSubscriptionsByChatId } from '@shared/polymarket-follower';

export async function handleListSubscriptions(chatId: number): Promise<string> {
  try {
    const subscriptions = await getActiveSubscriptionsByChatId(chatId);

    if (subscriptions.length === 0) {
      return JSON.stringify({ success: true, message: 'No active Polymarket subscriptions', subscriptions: [] });
    }

    const subscriptionsList = subscriptions.map(({ marketQuestion, marketSlug, createdAt }) => ({
      question: marketQuestion,
      slug: marketSlug,
      url: buildPolymarketUrl(marketSlug),
      subscribedSince: createdAt.toISOString(),
    }));

    return JSON.stringify({
      success: true,
      message: `Found ${subscriptions.length} active Polymarket subscription(s)`,
      subscriptions: subscriptionsList,
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to list subscriptions: ${err.message}` });
  }
}
