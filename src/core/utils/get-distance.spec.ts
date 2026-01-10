import { getDistance } from './get-distance';

describe('getDistance', () => {
  it('should return 0 for same location', () => {
    const location = { lat: 32.0853, lon: 34.7818 }; // Tel Aviv
    expect(getDistance(location, location)).toBe(0);
  });

  it('should calculate distance between Tel Aviv and Jerusalem (~54km)', () => {
    const telAviv = { lat: 32.0853, lon: 34.7818 };
    const jerusalem = { lat: 31.7683, lon: 35.2137 };
    const distance = getDistance(telAviv, jerusalem);

    // Approximately 54km (54000m), allow 5% tolerance
    expect(distance).toBeGreaterThan(51000);
    expect(distance).toBeLessThan(57000);
  });

  it('should calculate distance between Tel Aviv and Haifa (~82km)', () => {
    const telAviv = { lat: 32.0853, lon: 34.7818 };
    const haifa = { lat: 32.7940, lon: 34.9896 };
    const distance = getDistance(telAviv, haifa);

    // Approximately 82km, allow 5% tolerance
    expect(distance).toBeGreaterThan(78000);
    expect(distance).toBeLessThan(86000);
  });

  it('should calculate distance between New York and London (~5570km)', () => {
    const newYork = { lat: 40.7128, lon: -74.006 };
    const london = { lat: 51.5074, lon: -0.1278 };
    const distance = getDistance(newYork, london);

    // Approximately 5570km, allow 5% tolerance
    expect(distance).toBeGreaterThan(5290000);
    expect(distance).toBeLessThan(5850000);
  });

  it('should be symmetric (A to B equals B to A)', () => {
    const telAviv = { lat: 32.0853, lon: 34.7818 };
    const jerusalem = { lat: 31.7683, lon: 35.2137 };

    expect(getDistance(telAviv, jerusalem)).toBe(getDistance(jerusalem, telAviv));
  });

  it('should handle negative latitudes (Southern hemisphere)', () => {
    const sydney = { lat: -33.8688, lon: 151.2093 };
    const melbourne = { lat: -37.8136, lon: 144.9631 };
    const distance = getDistance(sydney, melbourne);

    // Approximately 714km, allow 5% tolerance
    expect(distance).toBeGreaterThan(678000);
    expect(distance).toBeLessThan(750000);
  });

  it('should handle negative longitudes (Western hemisphere)', () => {
    const losAngeles = { lat: 34.0522, lon: -118.2437 };
    const sanFrancisco = { lat: 37.7749, lon: -122.4194 };
    const distance = getDistance(losAngeles, sanFrancisco);

    // Approximately 559km, allow 5% tolerance
    expect(distance).toBeGreaterThan(531000);
    expect(distance).toBeLessThan(587000);
  });

  it('should handle crossing the prime meridian', () => {
    const london = { lat: 51.5074, lon: -0.1278 };
    const paris = { lat: 48.8566, lon: 2.3522 };
    const distance = getDistance(london, paris);

    // Approximately 344km, allow 5% tolerance
    expect(distance).toBeGreaterThan(327000);
    expect(distance).toBeLessThan(361000);
  });

  it('should return integer value (floored meters)', () => {
    const telAviv = { lat: 32.0853, lon: 34.7818 };
    const jerusalem = { lat: 31.7683, lon: 35.2137 };
    const distance = getDistance(telAviv, jerusalem);

    expect(Number.isInteger(distance)).toBe(true);
  });
});
