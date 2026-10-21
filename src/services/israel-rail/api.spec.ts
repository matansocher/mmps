import axios from 'axios';
import { buildSearchCacheKey, searchTrains } from './api';
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

  it('should add an arrive suffix for arrive-by searches', () => {
    expect(buildSearchCacheKey({ ...params, arriveBy: true })).toEqual('3700:2300:2025-01-01:08:00:3:arrive');
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

  it('should search by arrival and keep the last trains arriving by the requested time', async () => {
    vi.mocked(trainSearchCache.get).mockResolvedValue(null);
    const travel = (departure: string, arrival: string) => ({ departureTime: `2025-01-01T${departure}:00`, arrivalTime: `2025-01-01T${arrival}:00`, trains: [], travelMessages: [] });
    const travels = [travel('06:00', '06:40'), travel('06:30', '07:10'), travel('07:00', '07:40'), travel('07:30', '08:10')];
    vi.mocked(axios.post).mockResolvedValue({ data: { result: { travels, startFromIndex: 3 } } });

    const { travels: result } = await searchTrains({ ...params, limit: 2, arriveBy: true });

    expect(vi.mocked(axios.post).mock.calls[0][1]).toMatchObject({ scheduleType: 'ByArrival', hour: '8:00' });
    expect(result.map(({ departureTime, arrivalTime }) => `${departureTime}-${arrivalTime}`)).toEqual(['06:30-07:10', '07:00-07:40']);
  });
});
