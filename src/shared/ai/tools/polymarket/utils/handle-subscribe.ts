import { extractSlugFromUrl, getMarketBySlug } from '@services/polymarket';
import { createSubscription, getSubscriptionBySlug } from '@shared/polymarket-follower';

export async function handleSubscribe(chatId: number, marketIdentifier: string): Promise<string> {
  if (!marketIdentifier) {
    return JSON.stringify({ success: false, error: 'Market identifier (URL or slug) is required for subscribe action' });
  }

  try {
    const slug = extractSlugFromUrl(marketIdentifier);

    // Check if already subscribed
    const existingSubscription = await getSubscriptionBySlug(slug, chatId);
    if (existingSubscription) {
      return JSON.stringify({
        success: false,
        error: 'Already subscribed to this market',
        market: { question: existingSubscription.marketQuestion, slug: existingSubscription.marketSlug },
      });
    }

    // Fetch market data to validate and get details
    const market = await getMarketBySlug(slug);

    if (market.closed) {
      return JSON.stringify({ success: false, error: 'This market is already closed and cannot be subscribed to' });
    }

    await createSubscription({
      marketId: market.id,
      marketSlug: market.slug,
      marketQuestion: market.question,
      chatId,
    });

    const yesPct = (market.yesPrice * 100).toFixed(1);

    return JSON.stringify({
      success: true,
      message: `Successfully subscribed to Polymarket: "${market.question}"`,
      market: {
        question: market.question,
        slug: market.slug,
        currentPrice: `${yesPct}% Yes`,
        url: market.polymarketUrl,
      },
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to subscribe: ${err.message}` });
  }
}
