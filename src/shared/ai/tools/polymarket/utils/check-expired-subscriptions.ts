import { getEventOutcomes, getMarketBySlug } from '@services/polymarket';
import { getActiveSubscriptionsByChatId, removeSubscription } from '@shared/polymarket-follower';
import type { Subscription } from '@shared/polymarket-follower';

export type ExpiredSubscription = {
  readonly question: string;
  readonly slug: string;
  readonly finalPrice: string;
};

export type ExpiredSubscriptionsResult = {
  readonly expiredSubscriptions: ExpiredSubscription[];
  readonly message: string | null;
};

export async function checkAndCleanExpiredSubscriptions(chatId: number): Promise<ExpiredSubscriptionsResult> {
  const subscriptions = await getActiveSubscriptionsByChatId(chatId);

  if (subscriptions.length === 0) {
    return { expiredSubscriptions: [], message: null };
  }

  const expiredSubscriptions: ExpiredSubscription[] = [];

  for (const subscription of subscriptions) {
    const expired = subscription.type === 'multi' ? await checkExpiredMultiOutcome(chatId, subscription) : await checkExpiredBinary(chatId, subscription);
    if (expired) {
      expiredSubscriptions.push(expired);
    }
  }

  if (expiredSubscriptions.length === 0) {
    return { expiredSubscriptions: [], message: null };
  }

  const message =
    expiredSubscriptions.length === 1
      ? `1 market has ended and was removed from your subscriptions: "${expiredSubscriptions[0].question}" (Final: ${expiredSubscriptions[0].finalPrice})`
      : `${expiredSubscriptions.length} markets have ended and were removed from your subscriptions:\n${expiredSubscriptions.map((s) => `- "${s.question}" (Final: ${s.finalPrice})`).join('\n')}`;

  return { expiredSubscriptions, message };
}

async function checkExpiredBinary(chatId: number, subscription: Subscription): Promise<ExpiredSubscription | null> {
  try {
    const market = await getMarketBySlug(subscription.marketSlug);

    if (market.closed) {
      await removeSubscription(subscription.marketId, chatId);
      const yesPct = (market.yesPrice * 100).toFixed(1);
      return { question: subscription.marketQuestion, slug: subscription.marketSlug, finalPrice: `${yesPct}% Yes` };
    }

    return null;
  } catch {
    // If we can't fetch the market, it might have been removed - clean it up
    await removeSubscription(subscription.marketId, chatId);
    return { question: subscription.marketQuestion, slug: subscription.marketSlug, finalPrice: 'Market unavailable' };
  }
}

async function checkExpiredMultiOutcome(chatId: number, subscription: Subscription): Promise<ExpiredSubscription | null> {
  try {
    const event = await getEventOutcomes(subscription.marketSlug);

    if (event.closed || event.outcomes.length === 0) {
      await removeSubscription(subscription.marketId, chatId);
      const leader = event.outcomes[0];
      const finalPrice = leader ? `${leader.outcome} ${(leader.probability * 100).toFixed(1)}%` : 'Event ended';
      return { question: subscription.marketQuestion, slug: subscription.marketSlug, finalPrice };
    }

    return null;
  } catch {
    await removeSubscription(subscription.marketId, chatId);
    return { question: subscription.marketQuestion, slug: subscription.marketSlug, finalPrice: 'Event unavailable' };
  }
}
