import axios from 'axios';
import { buildSearchCacheKey, getTrainLine, searchTrains } from './api';
import { trainSearchCache } from './cache';
import type { SearchTrainsResult } from './types';

vi.mock('axios');
vi.mock('./cache', () => ({
  trainSearchCache: { get: vi.fn(), save: vi.fn() },
}));

const params = { fromStationId: 3700, toStationId: 2300, date: '2025-01-01', hour: '8:00', limit: 3 };

describe('buildSearchCacheKey()', () => {
  it('should normalize the hour and include every search param', () => {
    expect(buildSearchCacheKey(params)).toEqual('3700:2300:2025-01-01:08:00:3');
  });

  it('should separate arrival searches from departure searches', () => {
    expect(buildSearchCacheKey({ ...params, scheduleType: 'arrival' })).toEqual('3700:2300:2025-01-01:08:00:3:arrival');
  });
});

describe('searchTrains()', () => {
  beforeEach(() => {
    vi.mocked(trainSearchCache.get).mockReset();
    vi.mocked(trainSearchCache.save).mockReset();
    vi.mocked(axios.post).mockReset();
  });

  it('should return the cached result without calling the rail API', async () => {
    const cached: SearchTrainsResult = { travels: [], messages: ['cached'] };
    vi.mocked(trainSearchCache.get).mockResolvedValue(cached);

    expect(await searchTrains(params)).toEqual(cached);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('should call the rail API once for concurrent identical searches and cache the result', async () => {
    vi.mocked(trainSearchCache.get).mockResolvedValue(null);
    vi.mocked(axios.post).mockResolvedValue({ data: { result: { travels: [], travelMessages: [] } } });

    const [first, second] = await Promise.all([searchTrains(params), searchTrains(params)]);

    expect(first).toEqual(second);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(trainSearchCache.save).toHaveBeenCalledWith('3700:2300:2025-01-01:08:00:3', first);
  });

  describe('arrival search', () => {
    const travel = (departure: string, arrival: string) => ({
      departureTime: `2025-01-01T${departure}:00`,
      arrivalTime: `2025-01-01T${arrival}:00`,
      trains: [{ trainNumber: 1, orignStation: 3700, destinationStation: 2300, departureTime: `2025-01-01T${departure}:00`, arrivalTime: `2025-01-01T${arrival}:00` }],
    });

    it('should request ByArrival and return the latest trains that arrive by the requested time', async () => {
      vi.mocked(trainSearchCache.get).mockResolvedValue(null);
      const travels = [travel('06:58', '07:49'), travel('07:28', '08:24'), travel('07:58', '08:49'), travel('08:17', '09:12')];
      vi.mocked(axios.post).mockResolvedValue({ data: { result: { travels, startFromIndex: 2 } } });

      const { travels: result } = await searchTrains({ ...params, hour: '09:00', limit: 2, scheduleType: 'arrival' });

      expect(vi.mocked(axios.post).mock.calls[0][1]).toEqual(expect.objectContaining({ scheduleType: 'ByArrival', hour: '09:00' }));
      expect(result.map(({ departureTime, arrivalTime }) => `${departureTime}-${arrivalTime}`)).toEqual(['07:28-08:24', '07:58-08:49']);
    });
  });

  it('should map intermediate stops with station names, times and platforms', async () => {
    vi.mocked(trainSearchCache.get).mockResolvedValue(null);
    const train = {
      trainNumber: 123,
      orignStation: 3700,
      destinationStation: 2300,
      originPlatform: 3,
      destPlatform: 1,
      departureTime: '2025-01-01T08:00:00',
      arrivalTime: '2025-01-01T08:55:00',
      stopStations: [{ stationId: 3500, arrivalTime: '2025-01-01T08:08:00', departureTime: '2025-01-01T08:09:00', platform: 6 }],
    };
    const travel = { departureTime: train.departureTime, arrivalTime: train.arrivalTime, trains: [train] };
    vi.mocked(axios.post).mockResolvedValue({ data: { result: { travels: [travel], startFromIndex: 0 } } });

    const { travels } = await searchTrains({ ...params, hour: '08:00' });

    expect(travels[0].legs[0].intermediateStops).toEqual(1);
    expect(travels[0].legs[0].stops).toEqual([{ station: expect.objectContaining({ id: 3500 }), arrivalTime: '08:08', departureTime: '08:09', platform: 6 }]);
  });
});

describe('getTrainLine()', () => {
  const train = {
    trainNumber: 123,
    orignStation: 3700,
    destinationStation: 2300,
    originPlatform: 3,
    destPlatform: 1,
    departureTime: '2025-01-01T08:00:00',
    arrivalTime: '2025-01-01T08:55:00',
    stopStations: [{ stationId: 3500, arrivalTime: '2025-01-01T08:20:00', departureTime: '2025-01-01T08:21:00', platform: 2 }],
  };
  const lineParams = { fromStationId: 3700, toStationId: 2300, date: '2025-01-01', hour: '08:00', trainNumber: 123 };
  const mockTravels = (trains: readonly unknown[]) =>
    vi.mocked(axios.post).mockResolvedValue({ data: { result: { startFromIndex: 0, travels: [{ departureTime: '2025-01-01T08:00:00', arrivalTime: '2025-01-01T08:55:00', trains }] } } });

  beforeEach(() => {
    vi.mocked(axios.post).mockReset();
    vi.mocked(trainSearchCache.get).mockReset();
  });

  it('should map the full route stations and the live position, bypassing the cache', async () => {
    mockTravels([
      {
        ...train,
        routeStations: [
          { stationId: 2100, arrivalTime: '07:40', platform: 1 },
          { stationId: 3700, arrivalTime: '08:00', platform: 3 },
          { stationId: 2300, arrivalTime: '08:55', platform: 1 },
        ],
        trainPosition: { currentLastStation: 2100, nextStation: 3700, calcDiffMinutes: 4 },
      },
    ]);

    const line = await getTrainLine(lineParams);

    expect(trainSearchCache.get).not.toHaveBeenCalled();
    expect(line?.stops.map((stop) => [stop.station.id, stop.time, stop.platform])).toEqual([
      [2100, '07:40', 1],
      [3700, '08:00', 3],
      [2300, '08:55', 1],
    ]);
    expect(line).toMatchObject({ trainNumber: 123, date: '2025-01-01', boardingStationId: 3700, alightingStationId: 2300, position: { lastStationId: 2100, nextStationId: 3700, delayMinutes: 4 } });
  });

  it('should fall back to the trip stops and treat nextStation 0 as standing at the station', async () => {
    mockTravels([{ ...train, trainPosition: { currentLastStation: 3500, nextStation: 0, calcDiffMinutes: 0 } }]);

    const line = await getTrainLine(lineParams);

    expect(line?.stops.map((stop) => [stop.station.id, stop.time])).toEqual([
      [3700, '08:00'],
      [3500, '08:20'],
      [2300, '08:55'],
    ]);
    expect(line?.position).toEqual({ lastStationId: 3500, nextStationId: null, delayMinutes: 0 });
  });

  it('should return null when the train is not in the results', async () => {
    mockTravels([{ ...train, trainNumber: 999, trainPosition: null }]);
    expect(await getTrainLine(lineParams)).toEqual(null);
  });
});
