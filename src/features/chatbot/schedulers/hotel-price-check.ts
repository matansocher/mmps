import { type Bot, InlineKeyboard } from 'grammy';
import { getErrorMessage, Logger } from '@core/utils';
import { getHotelPrice } from '@services/booking';
import { getActiveWatches, updateLowestPrice } from '@shared/hotel-watcher';
import type { HotelWatch } from '@shared/hotel-watcher';

const logger = new Logger('chatbot:scheduler:hotel-price-check');

// Re-checks every active hotel watch once a day and DMs the user only when the
// cheapest available price for the stay reaches a new observed low.
export async function hotelPriceCheck(bot: Bot): Promise<void> {
  const watches = await getActiveWatches();
  if (!watches.length) {
    return;
  }

  for (const watch of watches) {
    await checkWatch(bot, watch);
  }
}

async function checkWatch(bot: Bot, watch: HotelWatch): Promise<void> {
  const { chatId, hotelId, checkinDate, checkoutDate, adults, roomQty } = watch;
  try {
    const current = await getHotelPrice({ hotelId, checkinDate, checkoutDate, adults, roomQty, currency: watch.currency });
    if (!current) {
      return;
    }

    if (current.price < watch.lastPrice) {
      await notifyDrop(bot, watch, current.price);
      await updateLowestPrice(chatId, hotelId, checkinDate, checkoutDate, current.price);
    }
  } catch (err) {
    logger.error(`Failed to check hotel ${hotelId} for chatId ${chatId}: ${getErrorMessage(err)}`);
  }
}

async function notifyDrop(bot: Bot, watch: HotelWatch, newPrice: number): Promise<void> {
  const drop = watch.lastPrice - newPrice;
  const name = watch.hotelName ?? 'Your watched hotel';
  const message = [
    `🏨 Price drop! ${name}`,
    `${watch.checkinDate} → ${watch.checkoutDate}`,
    `Was ${watch.currency} ${watch.lastPrice}, now ${watch.currency} ${newPrice} (down ${watch.currency} ${drop}).`,
  ].join('\n');
  const keyboard = new InlineKeyboard().url('View on Booking.com', watch.url);
  await bot.api.sendMessage(watch.chatId, message, { reply_markup: keyboard });
}
