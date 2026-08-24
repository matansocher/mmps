import { describe, expect, it, test } from 'vitest';
import { formatDaysUntilRelease, getDaysUntilRelease } from './get-days-until-release';

describe('getDaysUntilRelease()', () => {
  it('should return 0 for a release later the same Jerusalem day', () => {
    const now = new Date('2026-08-21T05:00:00Z');
    expect(getDaysUntilRelease(new Date('2026-08-21T20:00:00Z'), now)).toEqual(0);
  });

  it('should count calendar days, not 24h windows', () => {
    // 22:00 Jerusalem on Aug 21 to 01:00 Jerusalem on Aug 22 is 3 hours but one calendar day.
    const now = new Date('2026-08-21T19:00:00Z');
    expect(getDaysUntilRelease(new Date('2026-08-21T22:00:00Z'), now)).toEqual(1);
  });

  it('should return a negative count for past releases', () => {
    const now = new Date('2026-08-21T12:00:00Z');
    expect(getDaysUntilRelease(new Date('2026-08-18T12:00:00Z'), now)).toEqual(-3);
  });

  it('should count long horizons', () => {
    const now = new Date('2026-08-21T12:00:00Z');
    expect(getDaysUntilRelease(new Date('2026-09-15T12:00:00Z'), now)).toEqual(25);
  });
});

describe('formatDaysUntilRelease()', () => {
  test.each([
    { days: 0, expected: 'releases today' },
    { days: 1, expected: 'releases tomorrow' },
    { days: 25, expected: 'in 25 days' },
    { days: -1, expected: 'released 1 day ago' },
    { days: -4, expected: 'released 4 days ago' },
  ])('should return "$expected" when days is $days', ({ days, expected }) => {
    expect(formatDaysUntilRelease(days)).toEqual(expected);
  });
});
