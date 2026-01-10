import { buildPolymarketUrl } from '@services/polymarket';
import { getActiveSubscriptionsByChatId } from '@shared/polymarket-follower';
import { checkAndCleanExpiredSubscriptions } from './check-expired-subscriptions';

export async function handleListSubscriptions(chatId: number): Promise<string> {
  try {
    // Check and clean expired subscriptions first
    const { expiredSubscriptions, message: expiredMessage } = await checkAndCleanExpiredSubscriptions(chatId);

    const subscriptions = await getActiveSubscriptionsByChatId(chatId);

    if (subscriptions.length === 0) {
      const message = expiredMessage ? `${expiredMessage}\n\nNo remaining active Polymarket subscriptions.` : 'No active Polymarket subscriptions';
      return JSON.stringify({ success: true, message, subscriptions: [], expiredSubscriptions });
    }

    const subscriptionsList = subscriptions.map(({ marketQuestion, marketSlug, createdAt }) => ({
      question: marketQuestion,
      slug: marketSlug,
      url: buildPolymarketUrl(marketSlug),
      subscribedSince: createdAt.toISOString(),
    }));

    const baseMessage = `Found ${subscriptions.length} active Polymarket subscription(s)`;
    const message = expiredMessage ? `${expiredMessage}\n\n${baseMessage}` : baseMessage;

    return JSON.stringify({
      success: true,
      message,
      subscriptions: subscriptionsList,
      expiredSubscriptions,
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to list subscriptions: ${err.message}` });
  }
}
