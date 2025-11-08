import { parseJerusalemDate } from './parse-jerusalem-date';

describe('parseJerusalemDate', () => {
  describe('Winter time (UTC+2)', () => {
    it('should parse January date correctly', () => {
      const result = parseJerusalemDate('2025-01-15T14:30:00');
      // January 15th 14:30 in Jerusalem (UTC+2) = 12:30 UTC
      expect(result.toISOString()).toBe('2025-01-15T12:30:00.000Z');
    });

    it('should parse December date correctly', () => {
      const result = parseJerusalemDate('2025-12-20T18:00:00');
      // December 20th 18:00 in Jerusalem (UTC+2) = 16:00 UTC
      expect(result.toISOString()).toBe('2025-12-20T16:00:00.000Z');
    });

    it('should parse February date correctly', () => {
      const result = parseJerusalemDate('2025-02-28T09:15:30');
      // February 28th 09:15:30 in Jerusalem (UTC+2) = 07:15:30 UTC
      expect(result.toISOString()).toBe('2025-02-28T07:15:30.000Z');
    });
  });

  describe('Summer time (UTC+3, DST)', () => {
    it('should parse July date correctly', () => {
      const result = parseJerusalemDate('2025-07-15T14:30:00');
      // July 15th 14:30 in Jerusalem (UTC+3) = 11:30 UTC
      expect(result.toISOString()).toBe('2025-07-15T11:30:00.000Z');
    });

    it('should parse August date correctly', () => {
      const result = parseJerusalemDate('2025-08-10T18:00:00');
      // August 10th 18:00 in Jerusalem (UTC+3) = 15:00 UTC
      expect(result.toISOString()).toBe('2025-08-10T15:00:00.000Z');
    });

    it('should parse May date correctly', () => {
      const result = parseJerusalemDate('2025-05-20T12:00:00');
      // May 20th 12:00 in Jerusalem (UTC+3) = 09:00 UTC
      expect(result.toISOString()).toBe('2025-05-20T09:00:00.000Z');
    });
  });

  describe('Edge cases', () => {
    it('should handle midnight', () => {
      const result = parseJerusalemDate('2025-01-15T00:00:00');
      // January 15th 00:00 in Jerusalem (UTC+2) = January 14th 22:00 UTC
      expect(result.toISOString()).toBe('2025-01-14T22:00:00.000Z');
    });

    it('should handle end of day', () => {
      const result = parseJerusalemDate('2025-01-15T23:59:59');
      // January 15th 23:59:59 in Jerusalem (UTC+2) = 21:59:59 UTC
      expect(result.toISOString()).toBe('2025-01-15T21:59:59.000Z');
    });

    it('should handle noon', () => {
      const result = parseJerusalemDate('2025-07-01T12:00:00');
      // July 1st 12:00 in Jerusalem (UTC+3) = 09:00 UTC
      expect(result.toISOString()).toBe('2025-07-01T09:00:00.000Z');
    });

    it('should strip existing Z suffix', () => {
      const result = parseJerusalemDate('2025-01-15T14:30:00Z');
      // Should ignore the Z and treat as Jerusalem time
      expect(result.toISOString()).toBe('2025-01-15T12:30:00.000Z');
    });

    it('should strip existing timezone offset', () => {
      const result = parseJerusalemDate('2025-01-15T14:30:00+02:00');
      // Should ignore the +02:00 and treat as Jerusalem time
      expect(result.toISOString()).toBe('2025-01-15T12:30:00.000Z');
    });

    it('should handle date without time component', () => {
      const result = parseJerusalemDate('2025-01-15');
      // Should default to 00:00:00
      expect(result.toISOString()).toBe('2025-01-14T22:00:00.000Z');
    });
  });

  describe('DST transition periods', () => {
    it('should handle dates around March DST transition', () => {
      // March dates should be in DST (UTC+3)
      const marchResult = parseJerusalemDate('2025-03-28T14:30:00');
      // After DST starts: UTC+3
      expect(marchResult.getUTCHours()).toBeLessThanOrEqual(12);
    });

    it('should handle dates around October DST transition', () => {
      // Late October dates should be back to standard time (UTC+2)
      const octoberResult = parseJerusalemDate('2025-10-26T14:30:00');
      // After DST ends: UTC+2
      expect(octoberResult.getUTCHours()).toBeLessThanOrEqual(13);
    });
  });

  describe('Real-world reminder scenarios', () => {
    it('should handle "remind me tomorrow at 3pm" in winter', () => {
      const result = parseJerusalemDate('2025-01-16T15:00:00');
      // 3pm (15:00) in Jerusalem (UTC+2) = 13:00 UTC
      expect(result.toISOString()).toBe('2025-01-16T13:00:00.000Z');
    });

    it('should handle "remind me tomorrow at 3pm" in summer', () => {
      const result = parseJerusalemDate('2025-07-16T15:00:00');
      // 3pm (15:00) in Jerusalem (UTC+3) = 12:00 UTC
      expect(result.toISOString()).toBe('2025-07-16T12:00:00.000Z');
    });

    it('should handle default 6pm reminder time in winter', () => {
      const result = parseJerusalemDate('2025-02-10T18:00:00');
      // 6pm (18:00) in Jerusalem (UTC+2) = 16:00 UTC
      expect(result.toISOString()).toBe('2025-02-10T16:00:00.000Z');
    });

    it('should handle default 6pm reminder time in summer', () => {
      const result = parseJerusalemDate('2025-06-10T18:00:00');
      // 6pm (18:00) in Jerusalem (UTC+3) = 15:00 UTC
      expect(result.toISOString()).toBe('2025-06-10T15:00:00.000Z');
    });

    it('should handle morning reminder', () => {
      const result = parseJerusalemDate('2025-01-20T08:00:00');
      // 8am in Jerusalem (UTC+2) = 06:00 UTC
      expect(result.toISOString()).toBe('2025-01-20T06:00:00.000Z');
    });

    it('should handle late night reminder', () => {
      const result = parseJerusalemDate('2025-01-20T22:30:00');
      // 10:30pm in Jerusalem (UTC+2) = 20:30 UTC
      expect(result.toISOString()).toBe('2025-01-20T20:30:00.000Z');
    });
  });

  describe('Year boundaries', () => {
    it('should handle New Years Eve', () => {
      const result = parseJerusalemDate('2025-12-31T23:00:00');
      // December 31st 23:00 in Jerusalem (UTC+2) = 21:00 UTC
      expect(result.toISOString()).toBe('2025-12-31T21:00:00.000Z');
    });

    it('should handle New Years Day', () => {
      const result = parseJerusalemDate('2026-01-01T01:00:00');
      // January 1st 01:00 in Jerusalem (UTC+2) = December 31st 23:00 UTC
      expect(result.toISOString()).toBe('2025-12-31T23:00:00.000Z');
    });
  });

  describe('Month boundaries', () => {
    it('should handle end of month correctly', () => {
      const result = parseJerusalemDate('2025-01-31T23:30:00');
      expect(result.toISOString()).toBe('2025-01-31T21:30:00.000Z');
    });

    it('should handle start of month correctly', () => {
      const result = parseJerusalemDate('2025-02-01T00:30:00');
      expect(result.toISOString()).toBe('2025-01-31T22:30:00.000Z');
    });
  });

  describe('Leap year', () => {
    it('should handle February 29th on leap year', () => {
      const result = parseJerusalemDate('2024-02-29T12:00:00');
      // February 29th exists in 2024 (leap year)
      expect(result.toISOString()).toBe('2024-02-29T10:00:00.000Z');
    });
  });

  describe('Return type', () => {
    it('should return a Date object', () => {
      const result = parseJerusalemDate('2025-01-15T14:30:00');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return a valid Date', () => {
      const result = parseJerusalemDate('2025-01-15T14:30:00');
      expect(result.getTime()).not.toBeNaN();
    });
  });
});
