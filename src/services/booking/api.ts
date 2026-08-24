import { Logger } from '@core/utils';
import { DEFAULT_ADULTS, DEFAULT_CURRENCY, DEFAULT_ROOM_QTY } from './constants';
import type { BookingSearchParams, HotelPrice, RapidApiBlock, RapidApiHotelDetailsResponse, RapidApiRoomListResponse } from './types';
import { rapidApiGet } from './utils';

const logger = new Logger('booking:api');

function extractBlockPrice(block: RapidApiBlock): number | null {
  const breakdown = block.product_price_breakdown;
  const value = breakdown?.gross_amount?.value ?? breakdown?.all_inclusive_amount?.value;
  return typeof value === 'number' && value > 0 ? value : null;
}

// Fetches the cheapest available room offer for the given stay via booking-com15 (RapidAPI).
// Returns null when the hotel has no availability for the requested dates.
export async function getHotelPrice(params: BookingSearchParams): Promise<HotelPrice | null> {
  const { hotelId, checkinDate, checkoutDate } = params;
  const adults = params.adults ?? DEFAULT_ADULTS;
  const roomQty = params.roomQty ?? DEFAULT_ROOM_QTY;
  const currency = params.currency ?? DEFAULT_CURRENCY;

  const response = await rapidApiGet<RapidApiRoomListResponse>('/api/v1/hotels/getRoomList', {
    hotel_id: hotelId,
    arrival_date: checkinDate,
    departure_date: checkoutDate,
    adults,
    room_qty: roomQty,
    units: 'metric',
    currency_code: currency,
  });

  const blocks = response.data?.block ?? [];
  const prices = blocks.map(extractBlockPrice).filter((value): value is number => value !== null);

  if (!prices.length) {
    logger.warn(`No available prices for hotel ${hotelId} (${checkinDate} → ${checkoutDate})`);
    return null;
  }

  const cheapest = Math.min(...prices);
  return {
    hotelId,
    price: Math.round(cheapest),
    currency,
    checkinDate,
    checkoutDate,
  };
}

// Fetches the display name of a hotel (getRoomList does not include it).
export async function getHotelName(hotelId: string, checkinDate: string, checkoutDate: string): Promise<string | null> {
  const response = await rapidApiGet<RapidApiHotelDetailsResponse>('/api/v1/hotels/getHotelDetails', {
    hotel_id: hotelId,
    arrival_date: checkinDate,
    departure_date: checkoutDate,
    adults: DEFAULT_ADULTS,
    room_qty: DEFAULT_ROOM_QTY,
    units: 'metric',
    currency_code: DEFAULT_CURRENCY,
  });
  return response.data?.hotel_name ?? null;
}
