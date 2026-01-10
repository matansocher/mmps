import { getDateString } from './get-date-string';

describe('getDateString', () => {
  it('should format date as YYYY-MM-DD', () => {
    const date = new Date('2025-06-15T12:00:00Z');
    const result = getDateString(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should pad single digit month with zero', () => {
    const date = new Date('2025-01-15T12:00:00Z');
    const result = getDateString(date);
    expect(result).toContain('-01-');
  });

  it('should pad single digit day with zero', () => {
    const date = new Date('2025-06-05T12:00:00Z');
    const result = getDateString(date);
    expect(result).toContain('-05');
  });

  it('should handle December correctly (month 12)', () => {
    const date = new Date('2025-12-25T12:00:00Z');
    const result = getDateString(date);
    expect(result).toContain('-12-');
  });

  it('should return current date when no argument provided', () => {
    const result = getDateString();
    const now = new Date();

    // Should be a valid date string format
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Year should match current year (or adjacent due to timezone)
    const year = parseInt(result.split('-')[0]);
    expect(year).toBeGreaterThanOrEqual(now.getFullYear() - 1);
    expect(year).toBeLessThanOrEqual(now.getFullYear() + 1);
  });

  it('should handle year boundaries correctly', () => {
    const newYearsEve = new Date('2024-12-31T23:00:00Z');
    const result = getDateString(newYearsEve);
    // Depending on timezone, could be 2024-12-31 or 2025-01-01
    expect(result).toMatch(/^202[45]-/);
  });

  it('should handle leap year date', () => {
    const leapDay = new Date('2024-02-29T12:00:00Z');
    const result = getDateString(leapDay);
    expect(result).toContain('2024-');
    expect(result).toContain('-02-');
  });
});
