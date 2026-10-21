import { findLastLightRailDepartures, findLightRailDepartures } from './departures';
import { buildTimetable, parseGtfsTime } from './gtfs-parser';
import type { GtfsLineReader } from './gtfs-parser';
import { findLightRailStations } from './station-search';

const FILES: Record<string, string[]> = {
  'routes.txt': ['\uFEFFroute_id,agency_id,route_short_name,route_long_name,route_desc,route_type,route_color', 'R1,22,1,red,,0,', 'R2,22,3,red branch,,0,', 'BUS,5,1,bus,,3,'],
  'trips.txt': [
    '\uFEFFroute_id,service_id,trip_id,trip_headsign,direction_id,shape_id,wheelchair_accessible',
    'R1,WEEKDAY,T1,x,0,,1',
    'R1,WEEKDAY,T2,x,1,,1',
    'R1,WEEKDAY,T3,x,0,,1',
    'R2,SAT,T4,x,0,,1',
    'BUS,WEEKDAY,B1,x,0,,1',
  ],
  'calendar.txt': ['\uFEFFservice_id,sunday,monday,tuesday,wednesday,thursday,friday,saturday,start_date,end_date', 'WEEKDAY,1,1,1,1,1,0,0,20260101,20261231', 'SAT,0,0,0,0,0,0,1,20260101,20261231'],
  'stop_times.txt': [
    '\uFEFFtrip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type,shape_dist_traveled',
    'T1,08:00:00,08:00:00,A1,1,0,0,',
    'T1,08:05:00,08:05:00,B1,2,0,0,',
    'T1,08:12:30,08:12:30,C1,3,0,0,',
    'T2,08:30:00,08:30:00,C2,1,0,0,',
    'T2,08:37:00,08:37:00,B2,2,0,0,',
    'T2,08:42:00,08:42:00,A2,3,0,0,',
    'T3,23:58:00,23:58:00,A1,1,0,0,',
    'T3,24:03:00,24:03:00,B1,2,0,0,',
    'T3,24:10:00,24:10:00,C1,3,0,0,',
    'T4,10:00:00,10:00:00,D1,1,0,0,',
    'T4,10:04:00,10:04:00,B1,2,0,0,',
    'B1,08:00:00,08:00:00,Z1,1,0,0,',
  ],
  'stops.txt': [
    '\uFEFFstop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,location_type,parent_station,zone_id',
    'A1,1,אלנבי,,32.1,34.7,0,PA,',
    'A2,2,אלנבי,,32.1,34.7,0,PA,',
    "B1,3,הבעש''ט,,32.2,34.8,0,PB,",
    "B2,4,הבעש''ט,,32.2,34.8,0,PB,",
    'C1,5,קרית אריה,,32.3,34.9,0,,',
    'C2,6,קרית אריה,,32.3,34.9,0,,',
    'D1,7,שנקר,,32.4,34.9,0,,',
    'Z1,8,bus stop,,32.0,34.0,0,,',
  ],
  'translations.txt': ['\uFEFFtrans_id,lang,translation', 'אלנבי,EN,Allenby', 'הבעש"ט,EN,HaBesht', 'קרית אריה,EN,Kiriyat Arieh', 'אלנבי,AR,ألنبي'],
};

const readLines: GtfsLineReader = async function* (fileName) {
  yield* FILES[fileName];
};

describe('parseGtfsTime()', () => {
  test.each([
    { time: '08:05:30', expected: 29130 },
    { time: '25:01:34', expected: 90094 },
  ])('should return $expected for $time', ({ time, expected }) => {
    expect(parseGtfsTime(time)).toEqual(expected);
  });
});

describe('buildTimetable()', () => {
  test('should keep only light rail trips and group platforms into stations', async () => {
    const timetable = await buildTimetable(readLines, 1);
    expect(timetable.builtAt).toEqual(1);
    expect(timetable.trips).toHaveLength(4);
    expect(timetable.services.map(({ id }) => id).sort()).toEqual(['SAT', 'WEEKDAY']);
    expect(timetable.stations.map(({ id, nameHe, nameEn }) => ({ id, nameHe, nameEn }))).toEqual([
      { id: 'PA', nameHe: 'אלנבי', nameEn: 'Allenby' },
      { id: 'PB', nameHe: 'הבעש"ט', nameEn: 'HaBesht' },
      { id: 'C1', nameHe: 'קרית אריה', nameEn: 'Kiriyat Arieh' },
      { id: 'C2', nameHe: 'קרית אריה', nameEn: 'Kiriyat Arieh' },
      { id: 'D1', nameHe: 'שנקר', nameEn: 'שנקר' },
    ]);
  });
});

describe('findLightRailDepartures()', () => {
  // 2026-03-02 is a Monday, 2026-03-07 is a Saturday.
  test('should return trips in the requested direction from the requested time', async () => {
    const timetable = await buildTimetable(readLines);
    const departures = findLightRailDepartures(timetable, { fromStationId: 'PA', toStationId: 'C1', date: '2026-03-02', time: '07:00', limit: 2 });
    expect(departures).toEqual([
      { date: '2026-03-02', departureTime: '08:00', arrivalTime: '08:12', durationMinutes: 12, stopsCount: 2, terminus: expect.objectContaining({ id: 'C1' }) },
      { date: '2026-03-02', departureTime: '23:58', arrivalTime: '00:10', durationMinutes: 12, stopsCount: 2, terminus: expect.objectContaining({ id: 'C1' }) },
    ]);
  });

  test('should include trips of the previous service day that run after midnight', async () => {
    const timetable = await buildTimetable(readLines);
    const departures = findLightRailDepartures(timetable, { fromStationId: 'PB', toStationId: 'C1', date: '2026-03-03', time: '00:00', limit: 1 });
    expect(departures).toEqual([{ date: '2026-03-03', departureTime: '00:03', arrivalTime: '00:10', durationMinutes: 7, stopsCount: 1, terminus: expect.objectContaining({ id: 'C1' }) }]);
  });

  test('should respect the calendar weekdays', async () => {
    const timetable = await buildTimetable(readLines);
    const saturday = findLightRailDepartures(timetable, { fromStationId: 'PA', toStationId: 'C1', date: '2026-03-07', time: '00:00' });
    expect(saturday.map(({ date, departureTime }) => `${date} ${departureTime}`)).toEqual(['2026-03-08 08:00', '2026-03-08 23:58']);
    expect(findLightRailDepartures(timetable, { fromStationId: 'D1', toStationId: 'PB', date: '2026-03-07', time: '09:00' })).toHaveLength(1);
  });

  test('should throw when origin and destination are the same', async () => {
    const timetable = await buildTimetable(readLines);
    expect(() => findLightRailDepartures(timetable, { fromStationId: 'PA', toStationId: 'PA', date: '2026-03-02', time: '07:00' })).toThrow();
  });
});

describe('findLastLightRailDepartures()', () => {
  test('should return the final trips of the night including trips after midnight', async () => {
    const timetable = await buildTimetable(readLines);
    const departures = findLastLightRailDepartures(timetable, { fromStationId: 'PB', toStationId: 'C1', date: '2026-03-02', limit: 2 });
    expect(departures.map(({ date, departureTime }) => `${date} ${departureTime}`)).toEqual(['2026-03-02 08:05', '2026-03-03 00:03']);
  });

  test('should not roll over to the next day when there is no service', async () => {
    const timetable = await buildTimetable(readLines);
    expect(findLastLightRailDepartures(timetable, { fromStationId: 'PA', toStationId: 'C1', date: '2026-03-07' })).toEqual([]);
  });
});

describe('findLightRailStations()', () => {
  test.each([
    { query: 'allenby', expected: ['PA'] },
    { query: 'הבעש״ט', expected: ['PB'] },
    { query: 'habesht', expected: ['PB'] },
    { query: 'kiryat arye', expected: ['C1'] },
    { query: 'nowhere', expected: [] },
  ])('should resolve "$query"', async ({ query, expected }) => {
    const timetable = await buildTimetable(readLines);
    expect(findLightRailStations(timetable.stations, query).map(({ id }) => id)).toEqual(expected);
  });
});
