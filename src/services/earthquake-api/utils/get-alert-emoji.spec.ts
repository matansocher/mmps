import { getAlertEmoji } from './get-alert-emoji';

describe('getAlertEmoji', () => {
  describe('known alert levels', () => {
    it('should return green emoji for green alert', () => {
      expect(getAlertEmoji('green')).toBe('🟢');
    });

    it('should return yellow emoji for yellow alert', () => {
      expect(getAlertEmoji('yellow')).toBe('🟡');
    });

    it('should return orange emoji for orange alert', () => {
      expect(getAlertEmoji('orange')).toBe('🟠');
    });

    it('should return red emoji for red alert', () => {
      expect(getAlertEmoji('red')).toBe('🔴');
    });
  });

  describe('unknown alert levels', () => {
    it('should return white emoji for unknown alert', () => {
      expect(getAlertEmoji('unknown')).toBe('⚪');
    });

    it('should return white emoji for empty string', () => {
      expect(getAlertEmoji('')).toBe('⚪');
    });

    it('should return white emoji for random string', () => {
      expect(getAlertEmoji('purple')).toBe('⚪');
    });

    it('should return white emoji for uppercase alert level', () => {
      expect(getAlertEmoji('RED')).toBe('⚪');
    });
  });
});
