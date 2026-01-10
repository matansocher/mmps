import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@core/utils';
import { buildPolymarketUrl, getMarketById } from '@services/polymarket';
import type { MarketSummary } from '@services/polymarket';
import { sendShortenedMessage } from '@services/telegram';
import { getSubscriptionsGroupedByChatId, updateSubscription } from '@shared/polymarket-follower';
import type { Subscription } from '@shared/polymarket-follower';

const logger = new Logger('PolymarketUpdateScheduler');

type MarketUpdate = {
  readonly subscription: Subscription;
  readonly market: MarketSummary;
};

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

function formatDailyUpdateMessage(updates: MarketUpdate[]): string {
  const header = `*Polymarket Daily Update*\n\n`;

  const marketLines = updates.map(({ subscription, market }) => {
    const yesPct = (market.yesPrice * 100).toFixed(1);
    const changeStr = formatPriceChange(market.oneDayPriceChange, subscription.lastNotifiedPrice, market.yesPrice);
    const statusEmoji = market.closed ? '🔒' : market.active ? '🟢' : '⏸️';

    return `${statusEmoji} *${market.question}*
   Yes: ${yesPct}% ${changeStr}
   [View market](${buildPolymarketUrl(market.slug)})`;
  });

  return header + marketLines.join('\n\n');
}

function formatPriceChange(oneDayPriceChange: number | null, lastNotifiedPrice: number | null, currentPrice: number): string {
  // Prefer API's 24h change if available
  if (oneDayPriceChange !== null) {
    const changePercent = (oneDayPriceChange * 100).toFixed(1);
    const emoji = oneDayPriceChange > 0 ? '📈' : oneDayPriceChange < 0 ? '📉' : '➡️';
    return `${emoji} (${oneDayPriceChange >= 0 ? '+' : ''}${changePercent}%)`;
  }

  // Fallback: calculate from last notified price
  if (lastNotifiedPrice !== null) {
    const change = currentPrice - lastNotifiedPrice;
    const changePercent = (change * 100).toFixed(1);
    const emoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
    return `${emoji} (${change >= 0 ? '+' : ''}${changePercent}%)`;
  }

  return '';
}
