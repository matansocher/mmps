import { type AdsbAircraft, getAircraftInRadius } from '@services/adsb';
import { sampleCountryTraffic } from './sample-country';
import type { CountryGeometry, MonitoredCountry } from './types';

vi.mock('@services/adsb', () => ({ getAircraftInRadius: vi.fn() }));

const geometry: CountryGeometry = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ],
};

const country: MonitoredCountry = {
  alpha2: 'XX',
  name: 'Testland',
  emoji: '🏳️',
  mapCenter: { lat: 5, lon: 5, zoom: 6 },
  circles: [
    { lat: 3, lon: 3, radiusNm: 250 },
    { lat: 7, lon: 7, radiusNm: 250 },
  ],
};

const aircraft = (hex: string, lat: number, lon: number, extra: Partial<AdsbAircraft> = {}): AdsbAircraft => ({ hex, lat, lon, alt_baro: 30000, flight: `${hex.toUpperCase()}  `, ...extra });

describe('sampleCountryTraffic()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should dedupe overlapping circles, skip grounded aircraft and split inside/outside', async () => {
    vi.mocked(getAircraftInRadius)
      .mockResolvedValueOnce([aircraft('a1', 2, 2), aircraft('a2', 5, 5), aircraft('g1', 3, 3, { alt_baro: 'ground' }), aircraft('o1', 12, 12)])
      .mockResolvedValueOnce([aircraft('a2', 5, 5), aircraft('a3', 8, 8, { flight: undefined }), aircraft('n1', 6, 6, { lat: undefined })]);

    const result = await sampleCountryTraffic(country, geometry, 0);

    expect(getAircraftInRadius).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ insideCount: 3, outsideCount: 1, callsigns: ['A1', 'A2'] });
  });

  it('should throw when any circle fails so a partial sample is never stored', async () => {
    vi.mocked(getAircraftInRadius)
      .mockResolvedValueOnce([aircraft('a1', 2, 2)])
      .mockRejectedValueOnce(new Error('boom'));

    await expect(sampleCountryTraffic(country, geometry, 0)).rejects.toThrow('boom');
  });
});
