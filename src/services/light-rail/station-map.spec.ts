import { createCanvas } from 'canvas';
import { buildLightRailNetwork, buildStaticMapUrl, fitMapFrame, generateLightRailStationMap } from './station-map';
import type { LightRailStation, LightRailTimetable, LightRailTrip } from './types';

const station = (id: string, lat: number, lon: number): LightRailStation => ({ id, nameHe: id, nameEn: id, lat, lon });
const trip = (indexes: number[]): LightRailTrip => ({ serviceId: 's', stops: indexes.map((index, i) => [index, i * 60] as const) }) as LightRailTrip;

const stations = [station('A', 32.1, 34.88), station('B', 32.08, 34.82), station('C', 32.05, 34.78), station('D', 32.0, 34.75), station('E', 32.11, 34.81)];
const timetable = (trips: LightRailTrip[]) => ({ builtAt: 1, stations, trips }) as unknown as LightRailTimetable;

describe('buildLightRailNetwork()', () => {
  test('should merge both directions and branches into unique edges', () => {
    const trips = [...Array(10)].flatMap(() => [trip([0, 1, 2, 3]), trip([3, 2, 1, 0]), trip([3, 2, 1, 4])]);
    expect(buildLightRailNetwork(timetable(trips)).edges).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [1, 4],
    ]);
  });

  test('should skip rare trip patterns', () => {
    const trips = [...[...Array(20)].map(() => trip([0, 1, 2])), trip([2, 3])];
    expect(buildLightRailNetwork(timetable(trips)).edges).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });
});

describe('fitMapFrame()', () => {
  test('should pick the closest zoom that fits the canvas', () => {
    const frame = fitMapFrame(stations);
    expect(frame.zoom).toEqual(13);
    expect(frame.width).toBeLessThanOrEqual(1000);
    expect(frame.height).toBeLessThanOrEqual(1000);
  });
});

describe('buildStaticMapUrl()', () => {
  test.each([
    { language: 'he' as const, expected: 'language=iw' },
    { language: 'en' as const, expected: 'language=en' },
  ])('should request the $language map with hidden POIs and transit', ({ language, expected }) => {
    const url = buildStaticMapUrl({ lat: 32, lon: 34.8 }, 13, { width: 500, height: 400 }, language, 'KEY');
    expect(url).toContain(expected);
    expect(url).toContain('size=500x400');
    expect(url).toContain('scale=2');
    expect(url).toContain('style=feature%3Apoi%7Cvisibility%3Aoff');
    expect(url).toContain('style=feature%3Atransit%7Cvisibility%3Aoff');
  });
});

describe('generateLightRailStationMap()', () => {
  const tile = createCanvas(1, 1).toBuffer('image/png');
  const fetchMock = vi.fn(async () => new Response(new Uint8Array(tile)));
  const trips = [...Array(10)].map(() => trip([0, 1, 2, 3]));

  beforeEach(() => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'KEY');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test('should reuse the image across timetable rebuilds and redraw when the network changes', async () => {
    const first = await generateLightRailStationMap({ builtAt: 1, stations, trips } as unknown as LightRailTimetable, 'he');
    const calls = fetchMock.mock.calls.length;
    expect(calls).toBeGreaterThan(0);

    expect(await generateLightRailStationMap({ builtAt: 2, stations, trips } as unknown as LightRailTimetable, 'he')).toBe(first);
    expect(fetchMock.mock.calls.length).toEqual(calls);

    const moved = [station('A', 32.12, 34.88), ...stations.slice(1)];
    expect(await generateLightRailStationMap({ builtAt: 3, stations: moved, trips } as unknown as LightRailTimetable, 'he')).not.toBe(first);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(calls);
  });
});
