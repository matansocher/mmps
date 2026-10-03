import axios from 'axios';
import { CITIES_BASE_URL } from '../wolt.config';
import { getRestaurantsList } from './get-restaurants-data';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
vi.mock('@core/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@core/utils')>()), sleep: vi.fn() }));

const CITIES = [
  { slug: 'tel-aviv', location: { coordinates: [34.78, 32.08] } },
  { slug: 'hasharon', location: { coordinates: [34.85, 32.17] } },
  { slug: 'petah-tikva', location: { coordinates: [34.88, 32.09] } },
  { slug: 'eilat', location: { coordinates: [34.95, 29.55] } },
];

const LAT_TO_SLUG: Record<string, string> = { '32.08': 'tel-aviv', '32.17': 'hasharon', '32.09': 'petah-tikva' };

function restaurantsResponse(slug: string) {
  return { data: { sections: [{}, { items: [{ title: `${slug}-place`, image: { url: 'img' }, venue: { id: slug, online: true, slug } }] }] } };
}

function slugFromUrl(url: string): string {
  return LAT_TO_SLUG[new URL(url).searchParams.get('lat')];
}

describe('getRestaurantsList()', () => {
  const get = vi.mocked(axios.get);
  let inFlight = 0;
  let maxInFlight = 0;

  function mockRestaurants(handler: (slug: string) => Promise<unknown>) {
    get.mockImplementation(async (url: string) => {
      if (url === CITIES_BASE_URL) return { data: { results: CITIES } };
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return await handler(slugFromUrl(url));
      } finally {
        inFlight--;
      }
    });
  }

  beforeEach(() => {
    delete process.env.WOLT_RELAY_URL;
    get.mockReset();
    inFlight = 0;
    maxInFlight = 0;
  });

  it('should fetch only supported cities, never more than 2 at a time', async () => {
    mockRestaurants(async (slug) => restaurantsResponse(slug));

    const { restaurants, failedAreas } = await getRestaurantsList();

    expect(restaurants.map((r) => r.area).sort()).toEqual(['hasharon', 'petah-tikva', 'tel-aviv']);
    expect(failedAreas).toEqual([]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it('should keep the other cities when one city keeps failing', async () => {
    const attempts: Record<string, number> = {};
    mockRestaurants(async (slug) => {
      attempts[slug] = (attempts[slug] ?? 0) + 1;
      if (slug === 'hasharon') throw new Error('429');
      return restaurantsResponse(slug);
    });

    const { restaurants, failedAreas } = await getRestaurantsList();

    expect(restaurants.map((r) => r.area).sort()).toEqual(['petah-tikva', 'tel-aviv']);
    expect(failedAreas).toEqual(['hasharon']);
    expect(attempts).toEqual({ 'tel-aviv': 1, hasharon: 3, 'petah-tikva': 1 });
  });

  it('should recover a city after a transient failure', async () => {
    let failedOnce = false;
    mockRestaurants(async (slug) => {
      if (slug === 'tel-aviv' && !failedOnce) {
        failedOnce = true;
        throw new Error('timeout');
      }
      return restaurantsResponse(slug);
    });

    const { restaurants, failedAreas } = await getRestaurantsList();

    expect(restaurants.map((r) => r.area).sort()).toEqual(['hasharon', 'petah-tikva', 'tel-aviv']);
    expect(failedAreas).toEqual([]);
  });

  it('should parse the rating, delivery time range and price', async () => {
    mockRestaurants(async (slug) => ({
      data: {
        sections: [
          {},
          { items: [{ title: `${slug}-place`, image: { url: 'img' }, venue: { id: slug, online: true, slug, rating: { score: 8.4 }, estimate: 20, estimate_range: '15-25', price_range: 2 } }] },
        ],
      },
    }));

    const { restaurants } = await getRestaurantsList();

    expect(restaurants[0]).toEqual(expect.objectContaining({ rating: 8.4, estimateMinutes: 20, estimateRange: '15-25', priceRange: 2 }));
  });

  it('should find the venues in whichever section holds them, and dedupe repeats', async () => {
    const venue = (id: string) => ({ title: `${id}-place`, image: { url: 'img' }, venue: { id, online: true, slug: id } });
    mockRestaurants(async (slug) => ({ data: { sections: [{ items: [venue(slug)] }, { items: [{ title: 'banner', link: {} }] }, { items: [venue(slug), venue(`${slug}-2`)] }] } }));

    const { restaurants, failedAreas } = await getRestaurantsList();

    expect(restaurants.map((r) => r.id).sort()).toEqual(['hasharon', 'hasharon-2', 'petah-tikva', 'petah-tikva-2', 'tel-aviv', 'tel-aviv-2']);
    expect(failedAreas).toEqual([]);
  });

  it('should skip malformed items instead of failing the city', async () => {
    mockRestaurants(async (slug) => ({
      data: { sections: [{ items: [{ title: 'no venue' }, { venue: { id: 'no-title' } }, { title: `${slug}-place`, venue: { id: slug, online: false, slug } }] }] },
    }));

    const { restaurants, failedAreas } = await getRestaurantsList();

    expect(restaurants.map((r) => r.id).sort()).toEqual(['hasharon', 'petah-tikva', 'tel-aviv']);
    expect(restaurants[0].photo).toBeUndefined();
    expect(failedAreas).toEqual([]);
  });

  test.each([
    { case: 'an error page', data: '<html>Service unavailable</html>' },
    { case: 'no sections', data: { error: 'quota exceeded' } },
    { case: 'sections without venues', data: { sections: [{}, { items: [{ title: 'banner' }] }] } },
  ])('should report the city as failed for $case, so its cached restaurants are kept', async ({ data }) => {
    mockRestaurants(async (slug) => (slug === 'hasharon' ? { data } : restaurantsResponse(slug)));

    const { restaurants, failedAreas } = await getRestaurantsList();

    expect(restaurants.map((r) => r.area).sort()).toEqual(['petah-tikva', 'tel-aviv']);
    expect(failedAreas).toEqual(['hasharon']);
  });
});
