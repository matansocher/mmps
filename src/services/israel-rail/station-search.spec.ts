import { findStations, normalizeStationName } from './station-search';

describe('normalizeStationName()', () => {
  test.each([
    { name: 'Tel Aviv-Savidor Center', expected: 'tel aviv savidor center' },
    { name: 'ת"א מרכז', expected: 'תא מרכז' },
    { name: "Ra'anana West", expected: 'raanana west' },
    { name: "חיפה - חוף הכרמל (ש' רזיאל)", expected: 'חיפה חוף הכרמל ש רזיאל' },
  ])('should return $expected when name is $name', ({ name, expected }) => {
    expect(normalizeStationName(name)).toEqual(expected);
  });
});

describe('findStations()', () => {
  test.each([
    { query: 'Savidor', expected: [3700] },
    { query: 'סבידור', expected: [3700] },
    { query: 'ת"א מרכז', expected: [3700] },
    { query: 'תל אביב - סבידור מרכז', expected: [3700] },
    { query: 'Tel Aviv-HaHagana', expected: [4900] },
    { query: 'ההגנה', expected: [4900] },
    { query: 'Navon', expected: [680] },
    { query: 'ירושלים נבון', expected: [680] },
    { query: 'נתב"ג', expected: [8600] },
    { query: 'airport', expected: [8600] },
    { query: 'Herzliya', expected: [3500] },
    { query: 'חוף הכרמל', expected: [2300] },
    { query: 'Netanya', expected: [3300] },
    { query: 'נתניה', expected: [3300] },
  ])('should resolve "$query" to $expected', ({ query, expected }) => {
    expect(findStations(query).map((s) => s.id)).toEqual(expected);
  });

  test.each([
    { query: 'תל אביב', min: 4 },
    { query: 'Jerusalem', min: 3 },
    { query: 'חיפה', min: 3 },
  ])('should return multiple candidates for ambiguous "$query"', ({ query, min }) => {
    expect(findStations(query).length).toBeGreaterThanOrEqual(min);
  });

  test('should return no stations for unknown names', () => {
    expect(findStations('Gotham City')).toEqual([]);
  });
});
