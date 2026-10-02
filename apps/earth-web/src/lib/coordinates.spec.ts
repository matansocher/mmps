import { describe, expect, test } from 'vitest';
import { formatLatLonDms, parseCoordinates } from './coordinates';

describe('parseCoordinates()', () => {
  test.each([
    { input: '32.08, 34.78', expected: { lat: 32.08, lon: 34.78 } },
    { input: '32.08 34.78', expected: { lat: 32.08, lon: 34.78 } },
    { input: '-33.8568,151.2153', expected: { lat: -33.8568, lon: 151.2153 } },
    { input: '40.7128N 74.0060W', expected: { lat: 40.7128, lon: -74.006 } },
    { input: 'S33.8568 E151.2153', expected: { lat: -33.8568, lon: 151.2153 } },
    { input: '74.0060W 40.7128N', expected: { lat: 40.7128, lon: -74.006 } },
    { input: `32°4'48"N 34°46'48"E`, expected: { lat: 32.08, lon: 34.78 } },
  ])('parses "$input"', ({ input, expected }) => {
    const result = parseCoordinates(input);
    expect(result?.lat).toBeCloseTo(expected.lat, 6);
    expect(result?.lon).toBeCloseTo(expected.lon, 6);
  });

  test.each(['Tel Aviv', '95, 10', '10, 200', '10N 20N', '', '12.5', `32°75'N 34°E`])('rejects "%s"', (input) => {
    expect(parseCoordinates(input)).toBeNull();
  });
});

describe('formatLatLonDms()', () => {
  it('formats hemispheres and pads minutes', () => {
    expect(formatLatLonDms({ lat: 32.08, lon: -74.006 })).toEqual(`32°04'48.0"N 74°00'21.6"W`);
  });
});
