import type { ParsedBookingUrl } from '../types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toInt(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

// Extracts the hotel id + stay details from a full Booking.com hotel URL.
// The hotel id lives in the `dest_id` query param when `dest_type=hotel`.
export function parseBookingUrl(rawUrl: string): ParsedBookingUrl {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid Booking.com URL');
  }

  if (!/booking\.com$/i.test(url.hostname) && !/\.booking\.com$/i.test(url.hostname)) {
    throw new Error('URL is not a Booking.com link');
  }

  const params = url.searchParams;
  const hotelId = params.get('dest_id');
  if (!hotelId || params.get('dest_type') !== 'hotel') {
    throw new Error('Could not find a hotel id in the URL. Make sure it is a direct Booking.com hotel page link.');
  }

  const checkin = params.get('checkin');
  const checkout = params.get('checkout');

  return {
    hotelId,
    checkinDate: checkin && ISO_DATE.test(checkin) ? checkin : null,
    checkoutDate: checkout && ISO_DATE.test(checkout) ? checkout : null,
    adults: toInt(params.get('group_adults') ?? params.get('req_adults')),
    roomQty: toInt(params.get('no_rooms')),
  };
}
