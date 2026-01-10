import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@core/utils';
import { getMarketById } from '@services/polymarket';
import { sendShortenedMessage } from '@services/telegram';
import { getSubscriptionsGroupedByChatId, updateSubscription } from '@shared/polymarket-follower';
import type { Subscription } from '@shared/polymarket-follower';
import { formatDailyUpdateMessage } from './utils';
import type { MarketUpdate } from './utils';

const logger = new Logger('PolymarketUpdateScheduler');

export async function polymarketUpdate(bot: TelegramBot): Promise<void> {
  const subscriptionsByChatId = await getSubscriptionsGroupedByChatId();

  if (subscriptionsByChatId.size === 0) {
    return;
  }

  for (const [chatId, subscriptions] of subscriptionsByChatId) {
    await processSubscriptionsForChat(bot, chatId, subscriptions);
  }
}

async function processSubscriptionsForChat(bot: TelegramBot, chatId: number, subscriptions: Subscription[]): Promise<void> {
  const updates: MarketUpdate[] = [];

  for (const subscription of subscriptions) {
    try {
      const market = await getMarketById(subscription.marketId);
      updates.push({ subscription, market });

      // Update last notified price
      await updateSubscription(subscription.marketId, chatId, { lastNotifiedPrice: market.yesPrice, marketQuestion: market.question });
    } catch (err) {
      logger.error(`Failed to fetch market ${subscription.marketSlug}: ${err.message}`);
    }
  }

  if (updates.length === 0) {
    return;
  }

  const message = formatDailyUpdateMessage(updates);
  await sendShortenedMessage(bot, chatId, message, { parse_mode: 'Markdown' }).catch(() => {
    sendShortenedMessage(bot, chatId, message.replace(/[*_`[\]]/g, ''));
  });
}
