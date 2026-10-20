import { searchPlaces } from '@services/google-places';
import { getWalkingRoutes } from '@services/light-rail/walking';
import { findRailStationsNearPlace, findRailStationsNearPoint } from './nearby';
import { RAIL_STATIONS } from './stations';

vi.mock('./cache', () => ({ nearbyRailStationsCache: { get: vi.fn().mockResolvedValue(null), save: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@services/google-places', () => ({ searchPlaces: vi.fn() }));
vi.mock('@services/light-rail/walking', () => ({ getWalkingRoutes: vi.fn() }));

describe('RAIL_STATIONS', () => {
  it('should have coordinates inside Israel for every station', () => {
    const outside = RAIL_STATIONS.filter(({ lat, lon }) => !(lat > 29.4 && lat < 33.4 && lon > 34.2 && lon < 35.9));
    expect(outside).toEqual([]);
  });
});

describe('findRailStationsNearPoint()', () => {
  beforeEach(() => vi.clearAllMocks());

  test.each([
    { name: 'Azrieli', point: { lat: 32.0745, lon: 34.7925 }, expected: 4600 },
    { name: 'Savidor', point: { lat: 32.0838, lon: 34.7983 }, expected: 3700 },
    { name: 'Technion', point: { lat: 32.7767, lon: 35.0231 }, expected: 1220 },
  ])('should find station $expected closest to $name', async ({ point, expected }) => {
    vi.mocked(getWalkingRoutes).mockResolvedValue(null);
    const result = await findRailStationsNearPoint(point);
    expect(result.stations[0].station.id).toEqual(expected);
    expect(result.stations.every(({ walkingIsEstimate }) => walkingIsEstimate)).toEqual(true);
  });

  it('should sort by real walking time when the walking lookup succeeds', async () => {
    vi.mocked(getWalkingRoutes).mockResolvedValue([
      { meters: 900, minutes: 12 },
      { meters: 700, minutes: 9 },
      { meters: 2000, minutes: 25 },
    ]);
    const result = await findRailStationsNearPoint({ lat: 32.0745, lon: 34.7925 });
    expect(result.stations.map(({ walkingMinutes, walkingIsEstimate }) => ({ walkingMinutes, walkingIsEstimate }))).toEqual([
      { walkingMinutes: 9, walkingIsEstimate: false },
      { walkingMinutes: 12, walkingIsEstimate: false },
      { walkingMinutes: 25, walkingIsEstimate: false },
    ]);
  });
});

describe('findRailStationsNearPlace()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return null when the place is not found', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([]);
    expect(await findRailStationsNearPlace('nowhere')).toEqual(null);
  });

  it('should resolve the place and label the origin', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([{ name: 'Azrieli Mall', address: 'Derech Menachem Begin 132, Tel Aviv', lat: 32.0745, lng: 34.7925 }] as Awaited<ReturnType<typeof searchPlaces>>);
    vi.mocked(getWalkingRoutes).mockResolvedValue(null);
    const result = await findRailStationsNearPlace('קניון עזריאלי');
    expect(result.origin).toEqual({ lat: 32.0745, lon: 34.7925, label: 'Azrieli Mall, Derech Menachem Begin 132, Tel Aviv' });
    expect(result.stations[0].station.id).toEqual(4600);
  });
});
