import { describe, expect, it } from 'vitest';
import { parseBookingUrl } from './parse-booking-url';

describe('parseBookingUrl()', () => {
  const url = 'https://www.booking.com/hotel/jp/sheraton-hiroshima.html?checkin=2026-11-16&checkout=2026-11-18&dest_id=331651&dest_type=hotel&group_adults=2&no_rooms=1&group_children=0';

  it('extracts the hotel id from dest_id', () => {
    expect(parseBookingUrl(url).hotelId).toEqual('331651');
  });

  it('extracts check-in and check-out dates', () => {
    const parsed = parseBookingUrl(url);
    expect(parsed.checkinDate).toEqual('2026-11-16');
    expect(parsed.checkoutDate).toEqual('2026-11-18');
  });

  it('extracts adults and room quantity', () => {
    const parsed = parseBookingUrl(url);
    expect(parsed.adults).toEqual(2);
    expect(parsed.roomQty).toEqual(1);
  });

  it('returns null dates when they are absent', () => {
    const parsed = parseBookingUrl('https://www.booking.com/hotel/jp/sheraton-hiroshima.html?dest_id=331651&dest_type=hotel');
    expect(parsed.checkinDate).toBeNull();
    expect(parsed.checkoutDate).toBeNull();
  });

  it('throws for a non-Booking.com URL', () => {
    expect(() => parseBookingUrl('https://example.com/hotel?dest_id=1&dest_type=hotel')).toThrow();
  });

  it('throws when there is no hotel dest_id', () => {
    expect(() => parseBookingUrl('https://www.booking.com/searchresults.html?dest_id=123&dest_type=city')).toThrow();
  });

  it('throws for an invalid URL string', () => {
    expect(() => parseBookingUrl('not a url')).toThrow();
  });
});
