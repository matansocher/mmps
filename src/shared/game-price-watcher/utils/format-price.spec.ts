import { describe, expect, test } from 'vitest';
import { calculateDiscountPercent, formatPrice } from './format-price';

describe('formatPrice()', () => {
  test.each([
    { minorUnits: 28000, currency: 'ILS', expected: 'ILS 280.00' },
    { minorUnits: 5900, currency: 'ILS', expected: 'ILS 59.00' },
    { minorUnits: 2000, currency: 'ILS', expected: 'ILS 20.00' },
    { minorUnits: 1999, currency: 'USD', expected: 'USD 19.99' },
    { minorUnits: 0, currency: 'ILS', expected: 'ILS 0.00' },
    { minorUnits: 2000, currency: '', expected: '20.00' },
  ])('should return $expected for $minorUnits $currency', ({ minorUnits, currency, expected }) => {
    expect(formatPrice(minorUnits, currency)).toEqual(expected);
  });
});

describe('calculateDiscountPercent()', () => {
  test.each([
    { basePrice: 28000, currentPrice: 7000, expected: 75 },
    { basePrice: 28000, currentPrice: 14000, expected: 50 },
    { basePrice: 30000, currentPrice: 20000, expected: 33 },
    { basePrice: 28000, currentPrice: 28000, expected: 0 },
    { basePrice: 28000, currentPrice: 30000, expected: 0 },
    { basePrice: 0, currentPrice: 100, expected: 0 },
  ])('should return $expected when going from $basePrice to $currentPrice', ({ basePrice, currentPrice, expected }) => {
    expect(calculateDiscountPercent(basePrice, currentPrice)).toEqual(expected);
  });
});
