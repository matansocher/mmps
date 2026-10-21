import { buildRailSearchUrl } from './search-url';

describe('buildRailSearchUrl()', () => {
  test.each([
    {
      params: { fromStationId: 3700, toStationId: 2300, date: '2026-05-20', time: '08:30' },
      expected: 'https://www.rail.co.il/?page=routePlanSearchResults&fromStation=3700&toStation=2300&date=2026-05-20&hours=08&minutes=30&scheduleType=1',
    },
    {
      params: { fromStationId: 680, toStationId: 8600, date: '2026-01-02', time: '7:05' },
      expected: 'https://www.rail.co.il/?page=routePlanSearchResults&fromStation=680&toStation=8600&date=2026-01-02&hours=07&minutes=05&scheduleType=1',
    },
    {
      params: { fromStationId: 3700, toStationId: 8600, date: '2026-01-02', time: '11:00', arriveBy: true },
      expected: 'https://www.rail.co.il/?page=routePlanSearchResults&fromStation=3700&toStation=8600&date=2026-01-02&hours=11&minutes=00&scheduleType=2',
    },
  ])('should return $expected', ({ params, expected }) => {
    expect(buildRailSearchUrl(params)).toEqual(expected);
  });
});
