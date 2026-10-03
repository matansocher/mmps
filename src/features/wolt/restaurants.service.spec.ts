import type { WoltRestaurant } from '@shared/wolt';
import { RestaurantsService } from './restaurants.service';
import { getRestaurantsList } from './utils';
import { STALE_LIST_MAX_AGE_MS, TOO_OLD_LIST_THRESHOLD_MS } from './wolt.config';

vi.mock('./utils', () => ({ getRestaurantsList: vi.fn() }));

function restaurant(name: string, area: string): WoltRestaurant {
  return { id: name, name, area, isOnline: true } as WoltRestaurant;
}

describe('RestaurantsService', () => {
  const getList = vi.mocked(getRestaurantsList);
  let service: RestaurantsService;

  beforeEach(async () => {
    vi.useFakeTimers({ now: new Date('2024-01-01T12:00:00Z') });
    getList.mockReset();
    service = new RestaurantsService();
    // the list lives in module state, so start every test from a known list
    getList.mockResolvedValueOnce({ restaurants: [restaurant('A', 'tel-aviv'), restaurant('B', 'hasharon')], failedAreas: [] });
    await service.refreshRestaurants();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should keep restaurants of areas that failed to load', async () => {
    getList.mockResolvedValueOnce({ restaurants: [restaurant('C', 'tel-aviv')], failedAreas: ['hasharon'] });

    await service.refreshRestaurants();

    expect((await service.getRestaurants()).map((r) => r.name).sort()).toEqual(['B', 'C']);
  });

  it('should keep the previous list when nothing loaded', async () => {
    getList.mockResolvedValueOnce({ restaurants: [], failedAreas: [] });

    await service.refreshRestaurants();

    expect((await service.getRestaurants()).map((r) => r.name).sort()).toEqual(['A', 'B']);
  });

  it('should share one refresh between concurrent callers', async () => {
    vi.advanceTimersByTime(TOO_OLD_LIST_THRESHOLD_MS + 1);
    getList.mockResolvedValue({ restaurants: [restaurant('C', 'tel-aviv')], failedAreas: [] });

    const results = await Promise.all([service.getRestaurants(), service.getRestaurants(), service.getRestaurants()]);

    expect(getList).toHaveBeenCalledTimes(2); // beforeEach + one shared refresh
    results.forEach((r) => expect(r.map((x) => x.name)).toEqual(['C']));
  });

  it('should answer from a stale list and refresh in the background when allowed', async () => {
    vi.advanceTimersByTime(TOO_OLD_LIST_THRESHOLD_MS + 1);
    let resolveRefresh: (value: Awaited<ReturnType<typeof getRestaurantsList>>) => void;
    getList.mockReturnValueOnce(new Promise((resolve) => (resolveRefresh = resolve)));

    const stale = await service.getRestaurants({ allowStale: true });

    expect(stale.map((r) => r.name).sort()).toEqual(['A', 'B']);
    expect(getList).toHaveBeenCalledTimes(2);

    resolveRefresh({ restaurants: [restaurant('C', 'tel-aviv')], failedAreas: [] });
    await vi.waitFor(async () => expect((await service.getRestaurants({ allowStale: true })).map((r) => r.name)).toEqual(['C']));
  });

  it('should wait for a refresh when the list is too old even for searches', async () => {
    vi.advanceTimersByTime(STALE_LIST_MAX_AGE_MS + 1);
    getList.mockResolvedValueOnce({ restaurants: [restaurant('C', 'tel-aviv')], failedAreas: [] });

    const restaurants = await service.getRestaurants({ allowStale: true });

    expect(restaurants.map((r) => r.name)).toEqual(['C']);
  });
});
