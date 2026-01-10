import { mapImsCondition } from './condition-mapping';

describe('mapImsCondition', () => {
  describe('clear/sunny conditions', () => {
    it('should map code 1010 to Clear', () => {
      const result = mapImsCondition(1010);
      expect(result.condition).toBe('Clear');
      expect(result.code).toBe(1000);
      expect(result.isRain).toBe(false);
    });

    it('should map code 1020 to Partly Cloudy', () => {
      const result = mapImsCondition(1020);
      expect(result.condition).toBe('Partly Cloudy');
      expect(result.code).toBe(1003);
      expect(result.isRain).toBe(false);
    });
  });

  describe('cloudy conditions', () => {
    it('should map code 1220 to Cloudy', () => {
      const result = mapImsCondition(1220);
      expect(result.condition).toBe('Cloudy');
      expect(result.code).toBe(1006);
      expect(result.isRain).toBe(false);
    });

    it('should map code 1260 to Overcast', () => {
      const result = mapImsCondition(1260);
      expect(result.condition).toBe('Overcast');
      expect(result.code).toBe(1009);
      expect(result.isRain).toBe(false);
    });
  });

  describe('rain conditions', () => {
    it('should map code 1150 to Light Rain', () => {
      const result = mapImsCondition(1150);
      expect(result.condition).toBe('Light Rain');
      expect(result.isRain).toBe(true);
    });

    it('should map code 1160 to Moderate Rain', () => {
      const result = mapImsCondition(1160);
      expect(result.condition).toBe('Moderate Rain');
      expect(result.isRain).toBe(true);
    });

    it('should map code 1170 to Heavy Rain', () => {
      const result = mapImsCondition(1170);
      expect(result.condition).toBe('Heavy Rain');
      expect(result.isRain).toBe(true);
    });
  });

  describe('drizzle conditions', () => {
    it('should map code 1510 to Drizzle', () => {
      const result = mapImsCondition(1510);
      expect(result.condition).toBe('Drizzle');
      expect(result.isRain).toBe(true);
    });

    it('should map code 1520 to Light Drizzle', () => {
      const result = mapImsCondition(1520);
      expect(result.condition).toBe('Light Drizzle');
      expect(result.isRain).toBe(true);
    });
  });

  describe('thunderstorm conditions', () => {
    it('should map code 1610 to Thunderstorm', () => {
      const result = mapImsCondition(1610);
      expect(result.condition).toBe('Thunderstorm');
      expect(result.isRain).toBe(true);
    });

    it('should map code 1620 to Thunderstorm with Rain', () => {
      const result = mapImsCondition(1620);
      expect(result.condition).toBe('Thunderstorm with Rain');
      expect(result.isRain).toBe(true);
    });
  });

  describe('fog/mist conditions', () => {
    it('should map code 1310 to Fog', () => {
      const result = mapImsCondition(1310);
      expect(result.condition).toBe('Fog');
      expect(result.isRain).toBe(false);
    });

    it('should map code 1320 to Mist', () => {
      const result = mapImsCondition(1320);
      expect(result.condition).toBe('Mist');
      expect(result.isRain).toBe(false);
    });
  });

  describe('string input handling', () => {
    it('should handle string code input', () => {
      const result = mapImsCondition('1010');
      expect(result.condition).toBe('Clear');
    });

    it('should handle string code with leading zeros', () => {
      const result = mapImsCondition('1010');
      expect(result.condition).toBe('Clear');
    });
  });

  describe('unknown conditions', () => {
    it('should return Unknown for unmapped code', () => {
      const result = mapImsCondition(9999);
      expect(result.condition).toBe('Unknown');
      expect(result.code).toBe(0);
      expect(result.isRain).toBe(false);
    });

    it('should return Unknown for negative code', () => {
      const result = mapImsCondition(-1);
      expect(result.condition).toBe('Unknown');
    });

    it('should return Unknown for invalid string', () => {
      const result = mapImsCondition('invalid');
      expect(result.condition).toBe('Unknown');
    });
  });
});
