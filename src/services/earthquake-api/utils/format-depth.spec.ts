import { formatDepth } from './format-depth';

describe('formatDepth', () => {
  describe('shallow earthquakes (< 70km)', () => {
    it('should format 0km as shallow', () => {
      const result = formatDepth(0);

      expect(result).toBe('0.0km (shallow)');
    });

    it('should format 10km as shallow', () => {
      const result = formatDepth(10);

      expect(result).toBe('10.0km (shallow)');
    });

    it('should format 35.5km as shallow with one decimal', () => {
      const result = formatDepth(35.5);

      expect(result).toBe('35.5km (shallow)');
    });

    it('should format 69.9km as shallow', () => {
      const result = formatDepth(69.9);

      expect(result).toBe('69.9km (shallow)');
    });
  });

  describe('intermediate earthquakes (70-299km)', () => {
    it('should format 70km as intermediate', () => {
      const result = formatDepth(70);

      expect(result).toBe('70.0km (intermediate)');
    });

    it('should format 150km as intermediate', () => {
      const result = formatDepth(150);

      expect(result).toBe('150.0km (intermediate)');
    });

    it('should format 299.9km as intermediate', () => {
      const result = formatDepth(299.9);

      expect(result).toBe('299.9km (intermediate)');
    });
  });

  describe('deep earthquakes (>= 300km)', () => {
    it('should format 300km as deep', () => {
      const result = formatDepth(300);

      expect(result).toBe('300.0km (deep)');
    });

    it('should format 500km as deep', () => {
      const result = formatDepth(500);

      expect(result).toBe('500.0km (deep)');
    });

    it('should format 700km as deep', () => {
      const result = formatDepth(700);

      expect(result).toBe('700.0km (deep)');
    });
  });

  describe('edge cases', () => {
    it('should handle negative depth', () => {
      const result = formatDepth(-5);

      expect(result).toBe('-5.0km (shallow)');
    });

    it('should round to one decimal place', () => {
      const result = formatDepth(45.678);

      expect(result).toBe('45.7km (shallow)');
    });
  });
});
