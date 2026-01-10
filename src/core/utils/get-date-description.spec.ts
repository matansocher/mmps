import { getDateDescription } from './get-date-description';

describe('getDateDescription', () => {
  beforeEach(() => {
    // Reset any date modifications between tests
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return "היום" for today', () => {
    const today = new Date();
    jest.setSystemTime(today);

    const testDate = new Date(today);
    expect(getDateDescription(testDate)).toBe('היום');
  });

  it('should return "מחר" for tomorrow', () => {
    const today = new Date('2025-01-10T12:00:00');
    jest.setSystemTime(today);

    const tomorrow = new Date('2025-01-11T12:00:00');
    expect(getDateDescription(tomorrow)).toBe('מחר');
  });

  it('should return "מחרתיים" for day after tomorrow', () => {
    const today = new Date('2025-01-10T12:00:00');
    jest.setSystemTime(today);

    const dayAfterTomorrow = new Date('2025-01-12T12:00:00');
    expect(getDateDescription(dayAfterTomorrow)).toBe('מחרתיים');
  });

  it('should return "אתמול" for yesterday', () => {
    const today = new Date('2025-01-10T12:00:00');
    jest.setSystemTime(today);

    const yesterday = new Date('2025-01-09T12:00:00');
    expect(getDateDescription(yesterday)).toBe('אתמול');
  });

  it('should return date string for dates more than 2 days in future', () => {
    const today = new Date('2025-01-10T12:00:00');
    jest.setSystemTime(today);

    const futureDate = new Date('2025-01-15T12:00:00');
    const result = getDateDescription(futureDate);

    // Should return formatted date string, not a Hebrew word
    expect(result).not.toBe('היום');
    expect(result).not.toBe('מחר');
    expect(result).not.toBe('מחרתיים');
    expect(result).not.toBe('אתמול');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return date string for dates more than 1 day in past', () => {
    const today = new Date('2025-01-10T12:00:00');
    jest.setSystemTime(today);

    const pastDate = new Date('2025-01-05T12:00:00');
    const result = getDateDescription(pastDate);

    // Should return formatted date string
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle different times on the same day as "היום"', () => {
    const today = new Date('2025-01-10T08:00:00');
    jest.setSystemTime(today);

    const laterToday = new Date('2025-01-10T20:00:00');
    expect(getDateDescription(laterToday)).toBe('היום');
  });

  it('should handle midnight boundary for tomorrow', () => {
    const today = new Date('2025-01-10T23:59:00');
    jest.setSystemTime(today);

    const tomorrow = new Date('2025-01-11T00:01:00');
    expect(getDateDescription(tomorrow)).toBe('מחר');
  });
});
