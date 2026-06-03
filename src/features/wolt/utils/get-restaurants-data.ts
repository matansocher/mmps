import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Logger, sleep } from '@core/utils';
import type { WoltRestaurant } from '@shared/wolt';
import { CITIES_BASE_URL, CITIES_SLUGS_SUPPORTED, RESTAURANT_LINK_BASE_URL, RESTAURANTS_BASE_URL } from '../wolt.config';

type WoltCity = {
  readonly lat: number;
  readonly lon: number;
  readonly areaSlug: string;
};

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'app-language': 'en',
  Origin: 'https://wolt.com',
  Referer: 'https://wolt.com/',
};

const MAX_RETRIES_ON_RATE_LIMIT = 3;
const BASE_BACKOFF_MS = 1000;

// Wolt's consumer-api enforces a burst rate limit (~10 quick requests) per IP and returns 429 when exceeded.
// Multiple callers (search, mini-app, subscription alerting) can hit it concurrently, so we serialize every
// Wolt request through a single global queue and keep a minimum spacing between them to avoid bursts.
const MIN_INTERVAL_BETWEEN_REQUESTS_MS = 1000;
let requestQueue: Promise<unknown> = Promise.resolve();
let lastRequestStartedAt = 0;

function throttle<T>(fn: () => Promise<T>): Promise<T> {
  const result = requestQueue.then(async () => {
    const waitMs = MIN_INTERVAL_BETWEEN_REQUESTS_MS - (Date.now() - lastRequestStartedAt);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    lastRequestStartedAt = Date.now();
    return fn();
  });
  requestQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function getWithRetry<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES_ON_RATE_LIMIT; attempt++) {
    try {
      const res = await throttle(() => axios.get<T>(url, { ...config, headers: { ...REQUEST_HEADERS, ...config.headers } }));
      return res.data;
    } catch (err) {
      lastErr = err;
      const status = (err as AxiosError)?.response?.status;
      if (status !== 429 || attempt === MAX_RETRIES_ON_RATE_LIMIT) {
        throw err;
      }
      const retryAfterHeader = Number((err as AxiosError)?.response?.headers?.['retry-after']);
      const backoffMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0 ? retryAfterHeader * 1000 : BASE_BACKOFF_MS * 2 ** attempt;
      await sleep(backoffMs);
    }
  }
  throw lastErr;
}

// When areaSlugs is provided, only those areas are fetched (used by the subscription alerting flow
// to avoid hammering Wolt with all-city requests every cycle). Omit it to fetch the full list (search).
export async function getRestaurantsList(areaSlugs?: string[]): Promise<WoltRestaurant[]> {
  const logger = new Logger(getRestaurantsList.name);
  try {
    const allCities = await getCitiesList();
    const cities = areaSlugs?.length ? allCities.filter((city) => areaSlugs.includes(city.areaSlug)) : allCities;

    const restaurantsWithArea: any[] = [];
    for (const city of cities) {
      try {
        const data = await getWithRetry<any>(`${RESTAURANTS_BASE_URL}?lat=${city.lat}&lon=${city.lon}`);
        const restaurants = data.sections[1].items;
        restaurants.forEach((restaurant) => (restaurant.area = city.areaSlug));
        restaurantsWithArea.push(...restaurants);
      } catch (err) {
        logger.error(`${getRestaurantsList.name} - failed to fetch area ${city.areaSlug} - ${err}`);
      }
    }

    return restaurantsWithArea.map((restaurant) => {
      const { venue, title: name, area, image } = restaurant;
      const { id, online: isOnline, slug, tags, price_range: priceRange, rating, estimate, short_description: shortDescription } = venue;
      const link = RESTAURANT_LINK_BASE_URL.replace('{area}', area).replace('{slug}', slug);
      return {
        id,
        name,
        isOnline,
        slug,
        area,
        photo: image.url,
        link,
        tags: Array.isArray(tags) ? tags : undefined,
        priceRange: typeof priceRange === 'number' ? priceRange : undefined,
        rating: rating && typeof rating.score === 'number' ? rating.score : undefined,
        estimateMinutes: typeof estimate === 'number' ? estimate : undefined,
        shortDescription: typeof shortDescription === 'string' ? shortDescription : undefined,
      } as WoltRestaurant;
    });
  } catch (err) {
    logger.error(`${getRestaurantsList.name} - err - ${err}`);
    return [];
  }
}

export async function getAllCities() {
  const result = await getWithRetry<any>(CITIES_BASE_URL);
  return result?.results || [];
}

async function getCitiesList(): Promise<WoltCity[]> {
  const logger = new Logger(getCitiesList.name);
  try {
    const rawCities = await getAllCities();
    return rawCities
      .filter(({ slug }) => CITIES_SLUGS_SUPPORTED.includes(slug))
      .map(({ slug, location }) => {
        return { areaSlug: slug, lon: location.coordinates[0], lat: location.coordinates[1] };
      });
  } catch (err) {
    logger.error(`${getCitiesList.name} - err - ${err}`);
    return [];
  }
}
