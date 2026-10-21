import type { SearchTrainsParams, SearchTrainsResult, TrainTravel } from '@services/israel-rail';
import type { LightRailStation, LightRailTimetable } from '@services/light-rail';
import { planRailTrip } from './planner';
import type { RailTripInterchange } from './types';

const ALLENBY: LightRailStation = { id: 'A', nameEn: 'Allenby', nameHe: 'אלנבי', lat: 32.06, lon: 34.77 };
const ARLOZOROV: LightRailStation = { id: 'B', nameEn: 'Arlozorov', nameHe: 'ארלוזורוב', lat: 32.08, lon: 34.79 };
const SAVIDOR = { id: 3700, nameEn: 'Tel Aviv-Savidor Center', nameHe: 'תל אביב - סבידור מרכז', lat: 32.083, lon: 34.798 };
const HAIFA = { id: 2300, nameEn: 'Haifa-Hof HaKarmel', nameHe: 'חיפה - חוף הכרמל' };

const INTERCHANGE: RailTripInterchange = { lightRailStation: ARLOZOROV, railStation: SAVIDOR, straightLineMeters: 290, walkingMeters: 380, walkingMinutes: 5 };

// Format: "HH:mm"
const toSeconds = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60;
};

// Each Red Line ride takes 6 minutes between the two stops.
function buildTimetable(southbound: string[], northbound: string[]): LightRailTimetable {
  const trip = (from: number, to: number, time: string) => ({ serviceId: 'ALL', stops: [[from, toSeconds(time)] as const, [to, toSeconds(time) + 360] as const] });
  return {
    builtAt: 1,
    stations: [ALLENBY, ARLOZOROV],
    services: [{ id: 'ALL', days: [true, true, true, true, true, true, true], startDate: '20260101', endDate: '20261231' }],
    trips: [...southbound.map((time) => trip(1, 0, time)), ...northbound.map((time) => trip(0, 1, time))],
  };
}

function travel(date: string, departureTime: string, arrivalTime: string, trainNumber: number): TrainTravel {
  return {
    date,
    departureTime,
    arrivalTime,
    durationMinutes: 0,
    transfers: 0,
    transferDetails: [],
    legs: [{ trainNumber, from: SAVIDOR, to: HAIFA, departureTime, arrivalTime, originPlatform: 2, destinationPlatform: 1, delayMinutes: 0, intermediateStops: 3, stops: [] }],
  };
}

function mockSearchTrains(travels: TrainTravel[], messages: string[] = []) {
  return vi.fn(async ({ date, hour, limit }: SearchTrainsParams): Promise<SearchTrainsResult> => ({
    travels: travels.filter((item) => item.date === date && item.departureTime >= hour).slice(0, limit),
    messages,
  }));
}

const DATE = '2026-03-02';

describe('planRailTrip()', () => {
  test('should chain the Red Line, the walk and the earliest-arriving train with the transfer buffer', async () => {
    const timetable = buildTimetable([], ['08:00', '08:10', '08:20']);
    // 08:13 would be caught without the 3 minute buffer (arrive 08:06 + 5 min walk), 08:20 is the faster express.
    const searchTrains = mockSearchTrains(
      [travel(DATE, '08:13', '08:50', 1), travel(DATE, '08:20', '09:00', 2), travel(DATE, '08:40', '09:40', 3), travel(DATE, '09:00', '10:00', 4)],
      ['works on the line'],
    );
    const result = await planRailTrip(
      { timetable, interchanges: [INTERCHANGE], searchTrains },
      { origin: { kind: 'light_rail', station: ALLENBY }, destination: { kind: 'rail', station: HAIFA }, date: DATE, time: '07:55' },
    );

    expect(searchTrains).toHaveBeenCalledWith({ fromStationId: 3700, toStationId: 2300, date: DATE, hour: '08:14', limit: 5 });
    expect(result.messages).toEqual(['works on the line']);
    expect(result.trainSearchFailed).toEqual(false);
    // The 08:10 ride is dropped: the 08:20 ride catches the same train and leaves later.
    expect(result.plans.map(({ departureTime, arrivalTime, durationMinutes }) => ({ departureTime, arrivalTime, durationMinutes }))).toEqual([
      { departureTime: '08:00', arrivalTime: '09:00', durationMinutes: 60 },
      { departureTime: '08:20', arrivalTime: '09:40', durationMinutes: 80 },
    ]);

    const [best] = result.plans;
    expect(best.direction).toEqual('light_rail_then_train');
    expect(best.legs.map(({ mode }) => mode)).toEqual(['light_rail', 'walk', 'train']);
    expect(best.legs[1]).toEqual({
      mode: 'walk',
      from: { nameEn: 'Arlozorov', nameHe: 'ארלוזורוב' },
      to: { nameEn: SAVIDOR.nameEn, nameHe: SAVIDOR.nameHe },
      startTime: '08:06',
      walkingMinutes: 5,
      walkingMeters: 380,
      transferBufferMinutes: 3,
    });
    expect(best.legs[2]).toMatchObject({ mode: 'train', departureTime: '08:20', trainNumbers: [2], originPlatform: 2 });
  });

  test('should chain the train, the walk and the next Red Line ride', async () => {
    const timetable = buildTimetable(['08:05', '08:10', '08:40'], []);
    const searchTrains = mockSearchTrains([travel(DATE, '07:00', '08:00', 1), travel(DATE, '07:30', '08:30', 2)]);
    const result = await planRailTrip(
      { timetable, interchanges: [INTERCHANGE], searchTrains },
      { origin: { kind: 'rail', station: HAIFA }, destination: { kind: 'light_rail', station: ALLENBY }, date: DATE, time: '06:50' },
    );

    expect(searchTrains).toHaveBeenCalledWith({ fromStationId: 2300, toStationId: 3700, date: DATE, hour: '06:50', limit: 3 });
    expect(result.plans.map(({ direction, departureTime, arrivalTime }) => ({ direction, departureTime, arrivalTime }))).toEqual([
      { direction: 'train_then_light_rail', departureTime: '07:00', arrivalTime: '08:16' },
      { direction: 'train_then_light_rail', departureTime: '07:30', arrivalTime: '08:46' },
    ]);
    expect(result.plans[0].legs.map(({ mode }) => mode)).toEqual(['train', 'walk', 'light_rail']);
  });

  test('should search the next day trains after a late Red Line ride', async () => {
    const timetable = buildTimetable([], ['23:50']);
    const searchTrains = mockSearchTrains([travel('2026-03-03', '00:30', '01:30', 1)]);
    const result = await planRailTrip(
      { timetable, interchanges: [INTERCHANGE], searchTrains },
      { origin: { kind: 'light_rail', station: ALLENBY }, destination: { kind: 'rail', station: HAIFA }, date: DATE, time: '23:45' },
    );

    expect(searchTrains).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-03-03', hour: '00:04' }));
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0]).toMatchObject({ date: DATE, departureTime: '23:50', arrivalDate: '2026-03-03', arrivalTime: '01:30', durationMinutes: 100 });
  });

  test('should report a failed train search', async () => {
    const timetable = buildTimetable([], ['08:00']);
    const searchTrains = vi.fn(async (): Promise<SearchTrainsResult> => {
      throw new Error('down');
    });
    const result = await planRailTrip(
      { timetable, interchanges: [INTERCHANGE], searchTrains },
      { origin: { kind: 'light_rail', station: ALLENBY }, destination: { kind: 'rail', station: HAIFA }, date: DATE, time: '07:55' },
    );
    expect(result).toEqual({ plans: [], messages: [], trainSearchFailed: true });
  });

  test('should return Red Line and walk only when the destination is the interchange station', async () => {
    const timetable = buildTimetable([], ['08:00']);
    const searchTrains = mockSearchTrains([]);
    const result = await planRailTrip(
      { timetable, interchanges: [INTERCHANGE], searchTrains },
      { origin: { kind: 'light_rail', station: ALLENBY }, destination: { kind: 'rail', station: SAVIDOR }, date: DATE, time: '07:55' },
    );
    expect(searchTrains).not.toHaveBeenCalled();
    expect(result.plans[0]).toMatchObject({ departureTime: '08:00', arrivalTime: '08:11' });
    expect(result.plans[0].legs.map(({ mode }) => mode)).toEqual(['light_rail', 'walk']);
  });
});
