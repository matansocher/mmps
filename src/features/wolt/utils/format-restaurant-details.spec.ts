import type { WoltRestaurant } from '@shared/wolt';
import { formatRestaurantDetails } from './format-restaurant-details';

describe('formatRestaurantDetails()', () => {
  test.each([
    { details: { rating: 8, estimateRange: '15-25', estimateMinutes: 20, priceRange: 2 }, expected: '⭐ 8.0 · 🕒 15-25 דק׳ · ₪₪' },
    { details: { rating: 9.24, estimateMinutes: 30, priceRange: 1 }, expected: '⭐ 9.2 · 🕒 30 דק׳ · ₪' },
    { details: { estimateRange: '25-35', priceRange: 0 }, expected: '🕒 25-35 דק׳' },
    { details: { rating: 0 }, expected: '⭐ 0.0' },
    { details: {}, expected: '' },
  ])('should return "$expected" for $details', ({ details, expected }) => {
    expect(formatRestaurantDetails(details as WoltRestaurant)).toEqual(expected);
  });
});
