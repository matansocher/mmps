import type { Bot } from 'grammy';
import { getErrorMessage, Logger } from '@core/utils';
import { generateOddsImage, getEventOutcomes, getMarketById } from '@services/polymarket';
import { sendImageThenText, sendShortenedMessage } from '@services/telegram';
import { getSubscriptionsGroupedByChatId, removeSubscription, updateSubscription } from '@shared/polymarket-follower';
import type { Subscription } from '@shared/polymarket-follower';
import { buildPolymarketUpdateCards, formatDailyUpdateMessage, formatExpiredMarketsSection, formatMultiOutcomeUpdateMessage, toOutcomeSnapshots } from './utils';
import type { ExpiredMarketInfo, MarketUpdate, MultiOutcomeUpdate } from './utils';

const logger = new Logger('chatbot:scheduler:polymarket-update');

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
  const multiUpdates: MultiOutcomeUpdate[] = [];
  const expiredMarkets: ExpiredMarketInfo[] = [];

  for (const subscription of subscriptions) {
    if (subscription.type === 'multi') {
      await processMultiOutcomeSubscription(chatId, subscription, multiUpdates, expiredMarkets);
    } else {
      await processBinarySubscription(chatId, subscription, updates, expiredMarkets);
    }
  }

  if (updates.length === 0 && multiUpdates.length === 0 && expiredMarkets.length === 0) {
    return;
  }

  const sections: string[] = [];
  if (updates.length > 0) {
    sections.push(formatDailyUpdateMessage(updates));
  }
  if (multiUpdates.length > 0) {
    sections.push(formatMultiOutcomeUpdateMessage(multiUpdates));
  }

  const expiredSection = formatExpiredMarketsSection(expiredMarkets);
  const message = sections.length > 0 ? `${sections.join('\n\n')}${expiredSection}` : `*Polymarket Update*${expiredSection}`;

  const cards = buildPolymarketUpdateCards(updates, multiUpdates);
  await sendImageThenText(bot, chatId, {
    image: () => (cards.length ? generateOddsImage(cards, { subtitle: 'Daily update', language: 'en' }) : null),
    fileName: 'polymarket-odds.png',
    text: message,
    sendText: sendPolymarketText,
  });
}

async function sendPolymarketText(bot: Bot, chatId: number, message: string): Promise<void> {
  await sendShortenedMessage(bot, chatId, message, { parse_mode: 'Markdown' }).catch(() => {
    sendShortenedMessage(bot, chatId, message.replace(/[*_`[\]]/g, ''));
  });
}

async function processBinarySubscription(chatId: number, subscription: Subscription, updates: MarketUpdate[], expiredMarkets: ExpiredMarketInfo[]): Promise<void> {
  try {
    const market = await getMarketById(subscription.marketId);

    if (market.closed) {
      const yesPct = (market.yesPrice * 100).toFixed(1);
      await removeSubscription(subscription.marketId, chatId);
      expiredMarkets.push({ question: market.question, slug: market.slug, finalPrice: `${yesPct}% Yes` });
      return;
    }

    updates.push({ subscription, market });
    await updateSubscription(subscription.marketId, chatId, { lastNotifiedPrice: market.yesPrice, marketQuestion: market.question });
  } catch (err) {
    logger.error(`Failed to fetch market ${subscription.marketSlug}: ${getErrorMessage(err)}`);
  }
}

async function processMultiOutcomeSubscription(chatId: number, subscription: Subscription, multiUpdates: MultiOutcomeUpdate[], expiredMarkets: ExpiredMarketInfo[]): Promise<void> {
  try {
    const event = await getEventOutcomes(subscription.marketSlug);

    if (event.closed || event.outcomes.length === 0) {
      const leader = event.outcomes[0];
      const finalPrice = leader ? `${leader.outcome} ${(leader.probability * 100).toFixed(1)}%` : 'Event ended';
      await removeSubscription(subscription.marketId, chatId);
      expiredMarkets.push({ question: event.title, slug: event.slug, finalPrice });
      return;
    }

    multiUpdates.push({ subscription, event });
    await updateSubscription(subscription.marketId, chatId, { lastNotifiedOutcomes: toOutcomeSnapshots(event), marketQuestion: event.title });
  } catch (err) {
    logger.error(`Failed to fetch event ${subscription.marketSlug}: ${getErrorMessage(err)}`);
  }
}
