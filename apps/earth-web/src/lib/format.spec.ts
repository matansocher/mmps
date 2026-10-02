import { describe, expect, test } from 'vitest';
import { formatArea, formatDistance, niceScale } from './format';

describe('formatDistance()', () => {
  test.each([
    { m: 5.25, units: 'metric', expected: '5.3 m' },
    { m: 850, units: 'metric', expected: '850 m' },
    { m: 1234, units: 'metric', expected: '1.23 km' },
    { m: 12_345, units: 'metric', expected: '12.3 km' },
    { m: 1_234_567, units: 'metric', expected: '1,235 km' },
    { m: 100, units: 'imperial', expected: '328 ft' },
    { m: 16_093.44, units: 'imperial', expected: '10 mi' },
  ] as const)('formats $m m as $expected ($units)', ({ m, units, expected }) => {
    expect(formatDistance(m, units)).toEqual(expected);
  });
});

describe('formatArea()', () => {
  test.each([
    { m2: 500, expected: '500 m²' },
    { m2: 25_000, expected: '2.5 ha' },
    { m2: 12_364_000_000, expected: '12,364 km²' },
  ])('formats $m2 m² as $expected', ({ m2, expected }) => {
    expect(formatArea(m2)).toEqual(expected);
  });
});

describe('niceScale()', () => {
  it('picks a 1/2/5 length that fits', () => {
    expect(niceScale(10, 100)).toEqual({ label: '1 km', px: 100 });
    expect(niceScale(12, 100)).toEqual({ label: '1 km', px: 83 });
    expect(niceScale(30, 100)).toEqual({ label: '2 km', px: 67 });
  });

  it('returns null for invalid scales', () => {
    expect(niceScale(0, 100)).toBeNull();
  });
});
