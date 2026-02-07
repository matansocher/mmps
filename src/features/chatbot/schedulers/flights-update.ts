import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getFlightsAboveCountry } from '@shared/ai/tools/flights/utils';
import { getFlightSubscriptionsGroupedByChatId } from '@shared/flights-tracker';
import type { FlightSubscription } from '@shared/flights-tracker';

const logger = new Logger('FlightsUpdateScheduler');

export async function flightsUpdate(bot: TelegramBot): Promise<void> {
  const subscriptionsByChatId = await getFlightSubscriptionsGroupedByChatId();

  if (subscriptionsByChatId.size === 0) {
    return;
  }

  for (const [chatId, subscriptions] of subscriptionsByChatId) {
    await processFlightSubscriptionsForChat(bot, chatId, subscriptions);
  }
}

async function processFlightSubscriptionsForChat(bot: TelegramBot, chatId: number, subscriptions: FlightSubscription[]): Promise<void> {
  const results: { emoji: string; name: string; count: number }[] = [];

  for (const subscription of subscriptions) {
    try {
      const result = await getFlightsAboveCountry(subscription.countryName);
      results.push({ emoji: subscription.countryEmoji, name: subscription.countryName, count: result.flightCount });
    } catch (err) {
      logger.error(`Failed to fetch flights for ${subscription.countryName}: ${err.message}`);
      results.push({ emoji: subscription.countryEmoji, name: subscription.countryName, count: -1 });
    }
  }

  if (results.length === 0) {
    return;
  }

  const lines = results.map((r) => (r.count >= 0 ? `${r.emoji} ${r.name}: ${r.count} flights` : `${r.emoji} ${r.name}: unavailable`));
  const message = `✈️ *Flight Tracker Update*\n\n${lines.join('\n')}\n\n`;

  await sendShortenedMessage(bot, chatId, message, { parse_mode: 'Markdown' }).catch(() => {
    sendShortenedMessage(bot, chatId, message.replace(/[*_`[\]]/g, ''));
  });
}
