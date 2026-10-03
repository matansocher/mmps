import { describe, expect, it, test } from 'vitest';
import type { Country } from '../types';
import { countryFocus, createCountryIndex, pointInPolygon, pointInRing, ringBBox } from './countries';

const square = (west: number, south: number, east: number, north: number) => [west, south, east, south, east, north, west, north];

const country = (code: string, ...polygons: number[][][]): Country => ({ code, name: code, flag: '', continent: 'Test', area: 1000, neighbours: [], polygons });
const sized = (area: number, base: Country): Country => ({ ...base, area });

describe('pointInRing()', () => {
  test.each([
    { lat: 5, lon: 5, expected: true },
    { lat: 15, lon: 5, expected: false },
    { lat: 5, lon: -1, expected: false },
  ])('should return $expected for ($lat, $lon)', ({ lat, lon, expected }) => {
    expect(pointInRing({ lat, lon }, square(0, 0, 10, 10))).toEqual(expected);
  });
});

describe('pointInPolygon()', () => {
  it('should exclude points inside a hole', () => {
    const donut = [square(0, 0, 10, 10), square(4, 4, 6, 6)];
    expect(pointInPolygon({ lat: 5, lon: 5 }, donut)).toEqual(false);
    expect(pointInPolygon({ lat: 2, lon: 2 }, donut)).toEqual(true);
  });
});

describe('createCountryIndex()', () => {
  const outer = country('ZA', [square(0, 0, 10, 10), square(4, 4, 6, 6)]);
  const enclave = country('LS', [square(4, 4, 6, 6)]);
  const islands = country('FJ', [square(178, -18, 180, -16)], [square(-180, -18, -178, -16)]);
  const index = createCountryIndex([outer, enclave, islands]);

  test.each([
    { lat: 2, lon: 2, expected: 'ZA' },
    { lat: 5, lon: 5, expected: 'LS' },
    { lat: -17, lon: 179, expected: 'FJ' },
    { lat: -17, lon: -179, expected: 'FJ' },
    { lat: 50, lon: 50, expected: null },
  ])('should find $expected at ($lat, $lon)', ({ lat, lon, expected }) => {
    expect(index.findAt({ lat, lon })?.code ?? null).toEqual(expected);
  });

  it('should prefer the smaller country where borders overlap', () => {
    const big = sized(500_000, country('FR', [square(0, 0, 10, 10)]));
    const small = sized(400, country('AD', [square(9, 4, 11, 6)]));
    expect(createCountryIndex([big, small]).findAt({ lat: 5, lon: 9.5 })?.code).toEqual('AD');
  });

  it('should look countries up by code', () => {
    expect(index.byCode.get('LS')).toEqual(enclave);
  });
});

describe('ringBBox()', () => {
  it('should return the ring bounds', () => {
    expect(ringBBox(square(-3, 1, 7, 9))).toEqual({ west: -3, south: 1, east: 7, north: 9 });
  });
});

describe('countryFocus()', () => {
  it('should center on the largest landmass', () => {
    const focus = countryFocus(country('XX', [square(0, 0, 1, 1)], [square(20, 20, 30, 30)]));
    expect(focus.lat).toEqual(25);
    expect(focus.lon).toEqual(25);
    expect(Math.round(focus.spanKm)).toEqual(1106);
  });
});
