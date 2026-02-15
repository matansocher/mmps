import { getMarketBySlug } from '@services/polymarket';
import { getActiveSubscriptionsByChatId, removeSubscription } from '@shared/polymarket-follower';

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
    try {
      const market = await getMarketBySlug(subscription.marketSlug);

      if (market.closed) {
        await removeSubscription(subscription.marketId, chatId);

        const yesPct = (market.yesPrice * 100).toFixed(1);
        expiredSubscriptions.push({
          question: subscription.marketQuestion,
          slug: subscription.marketSlug,
          finalPrice: `${yesPct}% Yes`,
        });
      }
    } catch {
      // If we can't fetch the market, it might have been removed - clean it up
      await removeSubscription(subscription.marketId, chatId);
      expiredSubscriptions.push({
        question: subscription.marketQuestion,
        slug: subscription.marketSlug,
        finalPrice: 'Market unavailable',
      });
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
