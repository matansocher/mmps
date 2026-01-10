import { extractSlugFromUrl } from '@services/polymarket';
import { getActiveSubscriptionsByChatId, getSubscriptionBySlug, removeSubscription } from '@shared/polymarket-follower';
import { checkAndCleanExpiredSubscriptions } from './check-expired-subscriptions';

export async function handleUnsubscribe(chatId: number, marketIdentifier: string): Promise<string> {
  if (!marketIdentifier) {
    return JSON.stringify({ success: false, error: 'Market identifier (URL or slug) is required for unsubscribe action' });
  }

  try {
    // Check and clean expired subscriptions first
    const { expiredSubscriptions, message: expiredMessage } = await checkAndCleanExpiredSubscriptions(chatId);

    const slug = extractSlugFromUrl(marketIdentifier);

    // Try to find by slug first
    let subscription = await getSubscriptionBySlug(slug, chatId);

    // If not found by slug, try fuzzy match by question
    if (!subscription) {
      const subscriptions = await getActiveSubscriptionsByChatId(chatId);
      subscription = subscriptions.find((sub) => sub.marketSlug.toLowerCase().includes(slug.toLowerCase()) || sub.marketQuestion.toLowerCase().includes(slug.toLowerCase())) || null;
    }

    if (!subscription) {
      const errorMessage = expiredMessage ? `${expiredMessage}\n\nNot subscribed to any market matching "${marketIdentifier}"` : `Not subscribed to any market matching "${marketIdentifier}"`;
      return JSON.stringify({ success: false, error: errorMessage, expiredSubscriptions });
    }

    const result = await removeSubscription(subscription.marketId, chatId);

    if (result.modifiedCount === 0) {
      return JSON.stringify({ success: false, error: `Failed to unsubscribe from "${subscription.marketQuestion}"`, expiredSubscriptions, expiredMessage });
    }

    const baseMessage = `Successfully unsubscribed from "${subscription.marketQuestion}"`;
    const message = expiredMessage ? `${expiredMessage}\n\n${baseMessage}` : baseMessage;

    return JSON.stringify({
      success: true,
      message,
      expiredSubscriptions,
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to unsubscribe: ${err.message}` });
  }
}
