import { searchTrains } from './api';
import { findLastTrains, getServiceDate, pickLastTrains } from './last-train';
import type { TrainTravel } from './types';

vi.mock('./api', () => ({ searchTrains: vi.fn() }));

function travel(date: string, departureTime: string, transfers = 0): TrainTravel {
  return { date, departureTime, transfers } as TrainTravel;
}

const key = ({ date, departureTime }: TrainTravel) => `${date} ${departureTime}`;

describe('getServiceDate()', () => {
  test.each([
    { now: '2026-10-22T21:30:00', expected: '2026-10-22' },
    { now: '2026-10-23T01:15:00', expected: '2026-10-22' },
    { now: '2026-10-23T04:00:00', expected: '2026-10-23' },
  ])('should return $expected at $now', ({ now, expected }) => {
    expect(getServiceDate(new Date(now))).toEqual(expected);
  });
});

describe('pickLastTrains()', () => {
  test('should include night trains until 04:00 and ignore the next morning', () => {
    const travels = [
      travel('2026-10-23', '05:30'),
      travel('2026-10-23', '01:21'),
      travel('2026-10-22', '23:45', 2),
      travel('2026-10-22', '03:00'),
      travel('2026-10-23', '00:27'),
      travel('2026-10-22', '22:10'),
    ];
    const result = pickLastTrains(travels, '2026-10-22');
    expect(result.trains.map(key)).toEqual(['2026-10-22 23:45', '2026-10-23 00:27', '2026-10-23 01:21']);
    expect(result.hasNightTrains).toEqual(true);
    expect(result.lastDirectTrain).toBeUndefined();
  });

  test('should return the last direct train when the final trains all have transfers', () => {
    const travels = [travel('2026-10-22', '21:00'), travel('2026-10-22', '22:00', 1), travel('2026-10-22', '23:00', 2)];
    const result = pickLastTrains(travels, '2026-10-22', 2);
    expect(result.trains.map(key)).toEqual(['2026-10-22 22:00', '2026-10-22 23:00']);
    expect(result.lastDirectTrain && key(result.lastDirectTrain)).toEqual('2026-10-22 21:00');
    expect(result.hasNightTrains).toEqual(false);
  });

  test('should return no trains when there is no service', () => {
    expect(pickLastTrains([], '2026-10-23')).toEqual({ trains: [], hasNightTrains: false });
  });
});

describe('findLastTrains()', () => {
  test('should search the evening and the following night and merge the alerts', async () => {
    vi.mocked(searchTrains)
      .mockResolvedValueOnce({ travels: [travel('2026-10-22', '23:00')], messages: ['works'] })
      .mockResolvedValueOnce({ travels: [travel('2026-10-23', '00:27'), travel('2026-10-23', '06:00')], messages: ['works', 'night'] });

    const result = await findLastTrains({ fromStationId: 3700, toStationId: 2300, date: '2026-10-22' });

    expect(searchTrains).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-10-22', hour: '04:00' }));
    expect(searchTrains).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-10-23', hour: '00:00' }));
    expect(result.trains.map(key)).toEqual(['2026-10-22 23:00', '2026-10-23 00:27']);
    expect(result.messages).toEqual(['works', 'night']);
  });
});
