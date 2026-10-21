import { searchPlaces } from '@services/google-places';
import { findLightRailStationsNearPlace, findLightRailStationsNearPoint } from './nearby';
import type { LightRailStation } from './types';
import { getWalkingRoutes } from './walking';

vi.mock('./cache', () => ({ nearbyLightRailCache: { get: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@services/google-places', () => ({ searchPlaces: vi.fn() }));
vi.mock('./walking', () => ({ getWalkingRoutes: vi.fn() }));

const STATIONS: LightRailStation[] = [
  { id: 'b', nameHe: 'אלנבי', nameEn: 'Allenby', lat: 32.0705, lon: 34.7745 },
  { id: 'c', nameHe: 'קרליבך', nameEn: 'Carlebach', lat: 32.0687, lon: 34.7858 },
];
const POINT = { lat: 32.0695, lon: 34.777 };

describe('findLightRailStationsNearPoint()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should sort by real walking time when the walking lookup succeeds', async () => {
    vi.mocked(getWalkingRoutes).mockResolvedValue([
      { meters: 900, minutes: 12 },
      { meters: 700, minutes: 9 },
    ]);
    const result = await findLightRailStationsNearPoint(STATIONS, POINT);
    expect(result.stations.map(({ station, walkingMinutes, walkingIsEstimate }) => ({ id: station.id, walkingMinutes, walkingIsEstimate }))).toEqual([
      { id: 'c', walkingMinutes: 9, walkingIsEstimate: false },
      { id: 'b', walkingMinutes: 12, walkingIsEstimate: false },
    ]);
  });

  it('should fall back to estimates when the walking lookup fails', async () => {
    vi.mocked(getWalkingRoutes).mockResolvedValue(null);
    const result = await findLightRailStationsNearPoint(STATIONS, POINT);
    expect(result.stations[0].station.id).toEqual('b');
    expect(result.stations.every(({ walkingIsEstimate }) => walkingIsEstimate)).toEqual(true);
  });
});

describe('findLightRailStationsNearPlace()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should geocode the place and label the origin', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([{ placeId: 'p', name: 'Dizengoff Center', address: 'Dizengoff St 50', lat: 32.0754, lng: 34.7753, mapsUrl: '' }]);
    vi.mocked(getWalkingRoutes).mockResolvedValue(null);
    const result = await findLightRailStationsNearPlace(STATIONS, 'דיזנגוף סנטר');
    expect(result.origin).toEqual({ lat: 32.0754, lon: 34.7753, label: 'Dizengoff Center, Dizengoff St 50' });
    expect(searchPlaces).toHaveBeenCalledWith('דיזנגוף סנטר', { maxResults: 1 });
  });

  it('should return null when the place is not found', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([]);
    expect(await findLightRailStationsNearPlace(STATIONS, 'nowhere')).toEqual(null);
  });
});
