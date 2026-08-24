import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage } from '@core/utils';
import { DEFAULT_ADULTS, DEFAULT_ROOM_QTY, getHotelName, getHotelPrice, parseBookingUrl } from '@services/booking';
import { createWatch, getActiveWatchesByChatId, getWatch, removeWatch } from '@shared/hotel-watcher';

const chatId = MY_USER_ID;

const schema = z.object({
  action: z.enum(['add', 'remove', 'list']).describe('The action to perform: add a hotel to watch, remove one, or list current watches'),
  url: z.string().optional().describe('Full Booking.com hotel page URL, including check-in/check-out dates. Required for add and remove.'),
});

async function handleAdd(url?: string): Promise<string> {
  if (!url) {
    return JSON.stringify({ success: false, error: 'A Booking.com hotel URL is required to add a watch.' });
  }

  const parsed = parseBookingUrl(url);
  if (!parsed.checkinDate || !parsed.checkoutDate) {
    return JSON.stringify({ success: false, error: 'The URL must include check-in and check-out dates. Open the hotel page for specific dates and copy that link.' });
  }

  const adults = parsed.adults ?? DEFAULT_ADULTS;
  const roomQty = parsed.roomQty ?? DEFAULT_ROOM_QTY;

  const existing = await getWatch(chatId, parsed.hotelId, parsed.checkinDate, parsed.checkoutDate);
  if (existing) {
    return JSON.stringify({ success: false, error: `Already watching ${existing.hotelName ?? 'this hotel'} for ${parsed.checkinDate} → ${parsed.checkoutDate}.` });
  }

  const current = await getHotelPrice({ hotelId: parsed.hotelId, checkinDate: parsed.checkinDate, checkoutDate: parsed.checkoutDate, adults, roomQty });
  if (!current) {
    return JSON.stringify({ success: false, error: 'No availability found for those dates right now, so there is no baseline price to watch.' });
  }

  const hotelName = await getHotelName(parsed.hotelId, parsed.checkinDate, parsed.checkoutDate).catch(() => null);

  await createWatch({
    chatId,
    hotelId: parsed.hotelId,
    hotelName,
    url,
    checkinDate: parsed.checkinDate,
    checkoutDate: parsed.checkoutDate,
    adults,
    roomQty,
    currency: current.currency,
    lastPrice: current.price,
  });

  return JSON.stringify({
    success: true,
    message: `Now watching ${hotelName ?? 'this hotel'} for ${parsed.checkinDate} → ${parsed.checkoutDate}. Current cheapest price is ${current.currency} ${current.price} for the whole stay. I'll DM you if it drops.`,
  });
}

async function handleRemove(url?: string): Promise<string> {
  if (!url) {
    return JSON.stringify({ success: false, error: 'A Booking.com hotel URL is required to remove a watch.' });
  }

  const parsed = parseBookingUrl(url);
  if (!parsed.checkinDate || !parsed.checkoutDate) {
    return JSON.stringify({ success: false, error: 'The URL must include the same check-in and check-out dates you used when adding the watch.' });
  }

  const result = await removeWatch(chatId, parsed.hotelId, parsed.checkinDate, parsed.checkoutDate);
  if (!result.modifiedCount) {
    return JSON.stringify({ success: false, error: 'No matching active watch found for that hotel and those dates.' });
  }

  return JSON.stringify({ success: true, message: 'Stopped watching that hotel.' });
}

async function handleList(): Promise<string> {
  const watches = await getActiveWatchesByChatId(chatId);
  if (!watches.length) {
    return JSON.stringify({ success: true, watches: [], message: 'You are not watching any hotels right now.' });
  }

  const summary = watches.map((watch) => ({
    hotel: watch.hotelName ?? watch.hotelId,
    checkin: watch.checkinDate,
    checkout: watch.checkoutDate,
    lowestPrice: `${watch.currency} ${watch.lastPrice}`,
  }));

  return JSON.stringify({ success: true, watches: summary });
}

async function runner({ action, url }: z.infer<typeof schema>): Promise<string> {
  try {
    switch (action) {
      case 'add':
        return await handleAdd(url);
      case 'remove':
        return await handleRemove(url);
      case 'list':
        return await handleList();
      default:
        return JSON.stringify({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to ${action}: ${getErrorMessage(err)}` });
  }
}

export const hotelWatcherTool = tool(runner, {
  name: 'hotel_watcher',
  description: `Watch a Booking.com hotel for price drops and get notified.

Actions:
- add: Start watching a hotel for a specific stay. Provide the full Booking.com hotel page URL (it must include the check-in and check-out dates). Stores the current cheapest available room price as the initial baseline. A daily scheduler re-checks the price, DMs you when it reaches a new low, and lowers the baseline to that price.
- remove: Stop watching a hotel. Provide the same Booking.com URL (same hotel and dates) used when adding.
- list: List all hotels you are currently watching, with their lowest observed price.`,
  schema,
});
