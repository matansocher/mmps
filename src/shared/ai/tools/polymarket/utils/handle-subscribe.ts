import { extractSlugFromUrl, getMarketBySlug } from '@services/polymarket';
import { createSubscription, getSubscriptionBySlug } from '@shared/polymarket-follower';
import { checkAndCleanExpiredSubscriptions } from './check-expired-subscriptions';

export async function handleSubscribe(chatId: number, marketIdentifier: string): Promise<string> {
  if (!marketIdentifier) {
    return JSON.stringify({ success: false, error: 'Market identifier (URL or slug) is required for subscribe action' });
  }

  try {
    // Check and clean expired subscriptions first
    const { expiredSubscriptions, message: expiredMessage } = await checkAndCleanExpiredSubscriptions(chatId);

    const slug = extractSlugFromUrl(marketIdentifier);

    // Check if already subscribed
    const existingSubscription = await getSubscriptionBySlug(slug, chatId);
    if (existingSubscription) {
      return JSON.stringify({
        success: false,
        error: 'Already subscribed to this market',
        market: { question: existingSubscription.marketQuestion, slug: existingSubscription.marketSlug },
        expiredSubscriptions,
        expiredMessage,
      });
    }

    // Fetch market data to validate and get details
    const market = await getMarketBySlug(slug);

    if (market.closed) {
      return JSON.stringify({ success: false, error: 'This market is already closed and cannot be subscribed to', expiredSubscriptions, expiredMessage });
    }

    await createSubscription({
      marketId: market.id,
      marketSlug: market.slug,
      marketQuestion: market.question,
      chatId,
    });

    const yesPct = (market.yesPrice * 100).toFixed(1);
    const baseMessage = `Successfully subscribed to Polymarket: "${market.question}"`;
    const message = expiredMessage ? `${expiredMessage}\n\n${baseMessage}` : baseMessage;

    return JSON.stringify({
      success: true,
      message,
      market: {
        question: market.question,
        slug: market.slug,
        currentPrice: `${yesPct}% Yes`,
        url: market.polymarketUrl,
      },
      expiredSubscriptions,
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to subscribe: ${err.message}` });
  }
}
