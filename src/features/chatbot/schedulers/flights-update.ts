import type { Bot } from 'grammy';
import { Logger } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { getFlightsAboveCountry } from '@shared/ai/tools/flights/utils';
import { getFlightSubscriptionsGroupedByChatId } from '@shared/flights-tracker';
import type { FlightSubscription } from '@shared/flights-tracker';

const logger = new Logger('FlightsUpdateScheduler');

const LOW_FLIGHT_THRESHOLD = 3;

export async function flightsUpdate(bot: Bot): Promise<void> {
  const subscriptionsByChatId = await getFlightSubscriptionsGroupedByChatId();

  if (subscriptionsByChatId.size === 0) {
    return;
  }

  for (const [chatId, subscriptions] of subscriptionsByChatId) {
    await processFlightSubscriptionsForChat(bot, chatId, subscriptions);
  }
}

async function processFlightSubscriptionsForChat(bot: Bot, chatId: number, subscriptions: FlightSubscription[]): Promise<void> {
  const results: { emoji: string; name: string; count: number }[] = [];

  for (const subscription of subscriptions) {
    try {
      const result = await getFlightsAboveCountry(subscription.countryName);
      results.push({ emoji: subscription.countryEmoji, name: subscription.countryName, count: result.flightCount });
    } catch (err) {
      logger.error(`Failed to fetch flights for ${subscription.countryName}: ${err.message}`);
    }
  }

  const lowActivity = results.filter((r) => r.count <= LOW_FLIGHT_THRESHOLD);
  if (lowActivity.length === 0) {
    return;
  }

  const normalActivity = results.filter((r) => r.count > LOW_FLIGHT_THRESHOLD);
  const alertLines = lowActivity.map((r) => `${r.emoji} ${r.name}: ${r.count} flights ⚠️`);
  const normalLines = normalActivity.map((r) => `${r.emoji} ${r.name}: ${r.count} flights ✅`);

  let message = `✈️ *Low Flight Activity Alert*\n\n${alertLines.join('\n')}`;
  if (normalLines.length > 0) {
    message += `\n\nNormal activity:\n${normalLines.join('\n')}`;
  }

  await sendShortenedMessage(bot, chatId, message, { parse_mode: 'Markdown' }).catch(() => {
    sendShortenedMessage(bot, chatId, message.replace(/[*_`[\]]/g, ''));
  });
}
