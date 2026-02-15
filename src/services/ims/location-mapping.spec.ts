import { getImsLocationId, getLocationInfo, isIsraeliCity } from './location-mapping';

describe('getImsLocationId', () => {
  it('should return location ID for Jerusalem', () => {
    expect(getImsLocationId('jerusalem')).toBe(1);
  });

  it('should return location ID for Tel Aviv', () => {
    expect(getImsLocationId('tel aviv')).toBe(2);
  });

  it('should return location ID for Tel Aviv-Yafo variant', () => {
    expect(getImsLocationId('tel aviv-yafo')).toBe(2);
  });

  it('should return location ID for Tel Aviv - Yafo variant', () => {
    expect(getImsLocationId('tel aviv - yafo')).toBe(2);
  });

  it('should return location ID for Haifa', () => {
    expect(getImsLocationId('haifa')).toBe(3);
  });

  it('should return location ID for Beer Sheva', () => {
    expect(getImsLocationId('beer sheva')).toBe(8);
  });

  it("should return location ID for Be'er Sheva variant", () => {
    expect(getImsLocationId("be'er sheva")).toBe(8);
  });

  it('should return location ID for Beersheba variant', () => {
    expect(getImsLocationId('beersheba')).toBe(8);
  });

  it('should return location ID for Eilat', () => {
    expect(getImsLocationId('eilat')).toBe(31);
  });

  it('should handle case insensitivity', () => {
    expect(getImsLocationId('JERUSALEM')).toBe(1);
    expect(getImsLocationId('JeRuSaLeM')).toBe(1);
  });

  it('should trim whitespace', () => {
    expect(getImsLocationId('  jerusalem  ')).toBe(1);
  });

  it('should return null for unknown city', () => {
    expect(getImsLocationId('New York')).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(getImsLocationId('')).toBeNull();
  });

  it('should return location ID for Acre/Akko', () => {
    expect(getImsLocationId('acre')).toBe(27);
    expect(getImsLocationId('akko')).toBe(27);
  });

  it('should return location ID for Kfar Saba variants', () => {
    expect(getImsLocationId('kfar saba')).toBe(16);
    expect(getImsLocationId('kfar sava')).toBe(16);
  });
});

describe('getLocationInfo', () => {
  it('should return location info for Jerusalem (ID 1)', () => {
    const info = getLocationInfo(1);
    expect(info).not.toBeNull();
    expect(info!.nameEn).toBe('Jerusalem');
    expect(info!.coords.lat).toBeCloseTo(31.7683, 2);
    expect(info!.coords.lon).toBeCloseTo(35.2137, 2);
  });

  it('should return location info for Tel Aviv (ID 2)', () => {
    const info = getLocationInfo(2);
    expect(info).not.toBeNull();
    expect(info!.nameEn).toBe('Tel Aviv - Yafo');
    expect(info!.coords.lat).toBeCloseTo(32.0853, 2);
  });

  it('should return location info for Haifa (ID 3)', () => {
    const info = getLocationInfo(3);
    expect(info).not.toBeNull();
    expect(info!.nameEn).toBe('Haifa');
  });

  it('should return location info for Eilat (ID 31)', () => {
    const info = getLocationInfo(31);
    expect(info).not.toBeNull();
    expect(info!.nameEn).toBe('Eilat');
    expect(info!.coords.lat).toBeCloseTo(29.5577, 2);
  });

  it('should return null for unknown location ID', () => {
    expect(getLocationInfo(999)).toBeNull();
  });

  it('should return null for negative location ID', () => {
    expect(getLocationInfo(-1)).toBeNull();
  });

  it('should return null for zero location ID', () => {
    expect(getLocationInfo(0)).toBeNull();
  });
});

describe('isIsraeliCity', () => {
  it('should return true for known Israeli cities', () => {
    expect(isIsraeliCity('jerusalem')).toBe(true);
    expect(isIsraeliCity('tel aviv')).toBe(true);
    expect(isIsraeliCity('haifa')).toBe(true);
    expect(isIsraeliCity('eilat')).toBe(true);
    expect(isIsraeliCity('beer sheva')).toBe(true);
  });

  it('should return true with case insensitivity', () => {
    expect(isIsraeliCity('JERUSALEM')).toBe(true);
    expect(isIsraeliCity('Tel Aviv')).toBe(true);
  });

  it('should return false for non-Israeli cities', () => {
    expect(isIsraeliCity('New York')).toBe(false);
    expect(isIsraeliCity('London')).toBe(false);
    expect(isIsraeliCity('Paris')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isIsraeliCity('')).toBe(false);
  });

  it('should return false for random text', () => {
    expect(isIsraeliCity('random text')).toBe(false);
  });

  it('should handle city name variants', () => {
    expect(isIsraeliCity("be'er sheva")).toBe(true);
    expect(isIsraeliCity('beersheba')).toBe(true);
    expect(isIsraeliCity('tel aviv-yafo')).toBe(true);
  });
});
