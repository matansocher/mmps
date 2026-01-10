import { getHourInTimezone } from './get-hour-in-timezone';

describe('getHourInTimezone', () => {
  it('should return a number between 0 and 23', () => {
    const hour = getHourInTimezone('Asia/Jerusalem');
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });

  it('should return an integer', () => {
    const hour = getHourInTimezone('America/New_York');
    expect(Number.isInteger(hour)).toBe(true);
  });

  it('should return different hours for different timezones', () => {
    // These timezones are far apart enough that they should usually have different hours
    const jerusalemHour = getHourInTimezone('Asia/Jerusalem');
    const laHour = getHourInTimezone('America/Los_Angeles');

    // Jerusalem is ~10 hours ahead of LA (varies with DST)
    // They should differ by 9-11 hours
    const diff = Math.abs(jerusalemHour - laHour);
    const adjustedDiff = diff > 12 ? 24 - diff : diff;

    expect(adjustedDiff).toBeGreaterThanOrEqual(7);
    expect(adjustedDiff).toBeLessThanOrEqual(12);
  });

  it('should work with UTC timezone', () => {
    const hour = getHourInTimezone('UTC');
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
  });

  it('should work with various valid timezone strings', () => {
    const timezones = [
      'America/New_York',
      'Europe/London',
      'Asia/Tokyo',
      'Australia/Sydney',
      'Pacific/Auckland',
    ];

    for (const tz of timezones) {
      const hour = getHourInTimezone(tz);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThanOrEqual(23);
    }
  });

  it('should handle midnight edge case (hour 0 or 24)', () => {
    // This test verifies the function doesn't return 24 (should be 0)
    const hour = getHourInTimezone('Asia/Jerusalem');
    expect(hour).not.toBe(24);
  });
});
