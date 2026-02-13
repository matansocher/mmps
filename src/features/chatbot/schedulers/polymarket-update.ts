import type { Bot } from 'grammy';
import { Logger } from '@core/utils';
import { getMarketById } from '@services/polymarket';
import { sendShortenedMessage } from '@services/telegram-grammy';
import { getSubscriptionsGroupedByChatId, removeSubscription, updateSubscription } from '@shared/polymarket-follower';
import type { Subscription } from '@shared/polymarket-follower';
import { formatDailyUpdateMessage, formatExpiredMarketsSection } from './utils';
import type { ExpiredMarketInfo, MarketUpdate } from './utils';

const logger = new Logger('PolymarketUpdateScheduler');

export async function polymarketUpdate(bot: Bot): Promise<void> {
  const subscriptionsByChatId = await getSubscriptionsGroupedByChatId();

  if (subscriptionsByChatId.size === 0) {
    return;
  }

  for (const [chatId, subscriptions] of subscriptionsByChatId) {
    await processSubscriptionsForChat(bot, chatId, subscriptions);
  }
}

async function processSubscriptionsForChat(bot: Bot, chatId: number, subscriptions: Subscription[]): Promise<void> {
  const updates: MarketUpdate[] = [];
  const expiredMarkets: ExpiredMarketInfo[] = [];

  for (const subscription of subscriptions) {
    try {
      const market = await getMarketById(subscription.marketId);

      if (market.closed) {
        const yesPct = (market.yesPrice * 100).toFixed(1);
        await removeSubscription(subscription.marketId, chatId);
        expiredMarkets.push({ question: market.question, slug: market.slug, finalPrice: `${yesPct}% Yes` });
        continue;
      }

      updates.push({ subscription, market });
      await updateSubscription(subscription.marketId, chatId, { lastNotifiedPrice: market.yesPrice, marketQuestion: market.question });
    } catch (err) {
      logger.error(`Failed to fetch market ${subscription.marketSlug}: ${err.message}`);
    }
  }

  if (updates.length === 0 && expiredMarkets.length === 0) {
    return;
  }

  const activeSection = updates.length > 0 ? formatDailyUpdateMessage(updates) : '';
  const expiredSection = formatExpiredMarketsSection(expiredMarkets);
  const message = activeSection ? `${activeSection}${expiredSection}` : `*Polymarket Update*${expiredSection}`;

  await sendShortenedMessage(bot, chatId, message, { parse_mode: 'Markdown' }).catch(() => {
    sendShortenedMessage(bot, chatId, message.replace(/[*_`[\]]/g, ''));
  });
}
