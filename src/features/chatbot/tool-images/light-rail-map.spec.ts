import { hasLightRailStationMap } from './light-rail-map';

describe('hasLightRailStationMap()', () => {
  test.each([
    { description: 'a station_map result', toolResults: [{ toolName: 'light_rail', data: { stationMap: true } }], expected: true },
    { description: 'a departures result', toolResults: [{ toolName: 'light_rail', data: { departures: [] } }], expected: false },
    { description: 'another tool', toolResults: [{ toolName: 'israel_rail', data: { stationMap: true } }], expected: false },
  ])('should return $expected for $description', ({ toolResults, expected }) => {
    expect(hasLightRailStationMap(toolResults)).toEqual(expected);
  });
});
