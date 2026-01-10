import { extractSlugFromUrl } from '@services/polymarket';
import { getActiveSubscriptionsByChatId, getSubscriptionBySlug, removeSubscription } from '@shared/polymarket-follower';

export async function handleUnsubscribe(chatId: number, marketIdentifier: string): Promise<string> {
  if (!marketIdentifier) {
    return JSON.stringify({ success: false, error: 'Market identifier (URL or slug) is required for unsubscribe action' });
  }

  try {
    const slug = extractSlugFromUrl(marketIdentifier);

    // Try to find by slug first
    let subscription = await getSubscriptionBySlug(slug, chatId);

    // If not found by slug, try fuzzy match by question
    if (!subscription) {
      const subscriptions = await getActiveSubscriptionsByChatId(chatId);
      subscription = subscriptions.find((sub) => sub.marketSlug.toLowerCase().includes(slug.toLowerCase()) || sub.marketQuestion.toLowerCase().includes(slug.toLowerCase())) || null;
    }

    if (!subscription) {
      return JSON.stringify({ success: false, error: `Not subscribed to any market matching "${marketIdentifier}"` });
    }

    const result = await removeSubscription(subscription.marketId, chatId);

    if (result.modifiedCount === 0) {
      return JSON.stringify({ success: false, error: `Failed to unsubscribe from "${subscription.marketQuestion}"` });
    }

    return JSON.stringify({
      success: true,
      message: `Successfully unsubscribed from "${subscription.marketQuestion}"`,
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to unsubscribe: ${err.message}` });
  }
}
