import { extractSlugFromUrl, getEventOutcomes, getMarketBySlug } from '@services/polymarket';
import type { MultiOutcomeEventSummary } from '@services/polymarket';
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

    // Try to resolve as a multi-outcome event first (e.g. "World Cup Winner")
    const multiEvent = await resolveMultiOutcomeEvent(slug);
    if (multiEvent) {
      return subscribeToMultiOutcomeEvent(chatId, multiEvent, expiredSubscriptions, expiredMessage);
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
      type: 'binary',
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

async function resolveMultiOutcomeEvent(slug: string): Promise<MultiOutcomeEventSummary | null> {
  try {
    const event = await getEventOutcomes(slug);
    const isMultiOutcome = event.negRisk || event.outcomes.length > 1;
    return isMultiOutcome ? event : null;
  } catch {
    // Not an event slug (likely a single market slug) - fall back to binary handling
    return null;
  }
}

async function subscribeToMultiOutcomeEvent(
  chatId: number,
  event: MultiOutcomeEventSummary,
  expiredSubscriptions: unknown,
  expiredMessage: string | null,
): Promise<string> {
  if (event.closed || event.outcomes.length === 0) {
    return JSON.stringify({ success: false, error: 'This event is already closed and cannot be subscribed to', expiredSubscriptions, expiredMessage });
  }

  await createSubscription({
    marketId: event.id,
    marketSlug: event.slug,
    marketQuestion: event.title,
    chatId,
    type: 'multi',
  });

  const topOutcomes = event.outcomes.slice(0, 3).map((outcome) => `${outcome.outcome} ${(outcome.probability * 100).toFixed(1)}%`);
  const baseMessage = `Successfully subscribed to Polymarket event: "${event.title}" (${event.outcomes.length} outcomes)`;
  const message = expiredMessage ? `${expiredMessage}\n\n${baseMessage}` : baseMessage;

  return JSON.stringify({
    success: true,
    message,
    market: {
      question: event.title,
      slug: event.slug,
      type: 'multi',
      outcomeCount: event.outcomes.length,
      topOutcomes,
      url: event.polymarketUrl,
    },
    expiredSubscriptions,
  });
}
