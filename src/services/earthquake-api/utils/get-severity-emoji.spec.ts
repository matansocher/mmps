import { getSeverityEmoji } from './get-severity-emoji';

describe('getSeverityEmoji', () => {
  describe('great earthquakes (>= 8.0)', () => {
    it('should return warning emoji for magnitude 8.0', () => {
      expect(getSeverityEmoji(8.0)).toBe('⚠️');
    });

    it('should return warning emoji for magnitude 9.0', () => {
      expect(getSeverityEmoji(9.0)).toBe('⚠️');
    });

    it('should return warning emoji for magnitude 10.0', () => {
      expect(getSeverityEmoji(10.0)).toBe('⚠️');
    });
  });

  describe('major earthquakes (7.0-7.9)', () => {
    it('should return purple emoji for magnitude 7.0', () => {
      expect(getSeverityEmoji(7.0)).toBe('🟣');
    });

    it('should return purple emoji for magnitude 7.5', () => {
      expect(getSeverityEmoji(7.5)).toBe('🟣');
    });

    it('should return purple emoji for magnitude 7.9', () => {
      expect(getSeverityEmoji(7.9)).toBe('🟣');
    });
  });

  describe('strong earthquakes (6.0-6.9)', () => {
    it('should return red emoji for magnitude 6.0', () => {
      expect(getSeverityEmoji(6.0)).toBe('🔴');
    });

    it('should return red emoji for magnitude 6.5', () => {
      expect(getSeverityEmoji(6.5)).toBe('🔴');
    });

    it('should return red emoji for magnitude 6.9', () => {
      expect(getSeverityEmoji(6.9)).toBe('🔴');
    });
  });

  describe('moderate earthquakes (5.0-5.9)', () => {
    it('should return orange emoji for magnitude 5.0', () => {
      expect(getSeverityEmoji(5.0)).toBe('🟠');
    });

    it('should return orange emoji for magnitude 5.5', () => {
      expect(getSeverityEmoji(5.5)).toBe('🟠');
    });

    it('should return orange emoji for magnitude 5.9', () => {
      expect(getSeverityEmoji(5.9)).toBe('🟠');
    });
  });

  describe('minor earthquakes (< 5.0)', () => {
    it('should return yellow emoji for magnitude 4.9', () => {
      expect(getSeverityEmoji(4.9)).toBe('🟡');
    });

    it('should return yellow emoji for magnitude 3.0', () => {
      expect(getSeverityEmoji(3.0)).toBe('🟡');
    });

    it('should return yellow emoji for magnitude 1.0', () => {
      expect(getSeverityEmoji(1.0)).toBe('🟡');
    });

    it('should return yellow emoji for magnitude 0', () => {
      expect(getSeverityEmoji(0)).toBe('🟡');
    });

    it('should return yellow emoji for negative magnitude', () => {
      expect(getSeverityEmoji(-1)).toBe('🟡');
    });
  });
});
