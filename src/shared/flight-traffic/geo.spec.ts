import countries from '@features/worldly/assets/countries.json';
import { isPointInGeometry } from './geo';
import type { CountryGeometry } from './types';

const square = (minLon: number, minLat: number, maxLon: number, maxLat: number) => [
  [minLon, minLat],
  [maxLon, minLat],
  [maxLon, maxLat],
  [minLon, maxLat],
  [minLon, minLat],
];

describe('isPointInGeometry()', () => {
  const polygonWithHole: CountryGeometry = { type: 'Polygon', coordinates: [square(0, 0, 10, 10), square(4, 4, 6, 6)] };
  const multiPolygon: CountryGeometry = { type: 'MultiPolygon', coordinates: [[square(0, 0, 1, 1)], [square(5, 5, 6, 6)]] };

  test.each([
    { name: 'inside the outer ring', lat: 2, lon: 2, expected: true },
    { name: 'inside the hole', lat: 5, lon: 5, expected: false },
    { name: 'outside', lat: 11, lon: 2, expected: false },
  ])('should handle a polygon point $name', ({ lat, lon, expected }) => {
    expect(isPointInGeometry(lat, lon, polygonWithHole)).toEqual(expected);
  });

  test.each([
    { lat: 0.5, lon: 0.5, expected: true },
    { lat: 5.5, lon: 5.5, expected: true },
    { lat: 3, lon: 3, expected: false },
  ])('should return $expected for a multipolygon point ($lat, $lon)', ({ lat, lon, expected }) => {
    expect(isPointInGeometry(lat, lon, multiPolygon)).toEqual(expected);
  });

  it('should return false for unsupported geometry types', () => {
    expect(isPointInGeometry(0, 0, { type: 'Point', coordinates: [] })).toEqual(false);
  });

  test.each([
    { city: 'Tel Aviv', lat: 32.08, lon: 34.78, expected: true },
    { city: 'Beer Sheva', lat: 31.25, lon: 34.79, expected: true },
    { city: 'Amman', lat: 31.95, lon: 35.93, expected: false },
    { city: 'Beirut', lat: 33.89, lon: 35.5, expected: false },
  ])('should return $expected for $city against the Worldly Israel border', ({ lat, lon, expected }) => {
    const israel = countries.find(({ alpha2 }) => alpha2 === 'IL');
    expect(isPointInGeometry(lat, lon, israel.geometry as CountryGeometry)).toEqual(expected);
  });
});
