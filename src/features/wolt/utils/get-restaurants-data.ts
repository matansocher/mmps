import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { Logger, sleep } from '@core/utils';
import type { WoltRestaurant } from '@shared/wolt';
import { CITIES_BASE_URL, CITIES_SLUGS_SUPPORTED, RESTAURANT_LINK_BASE_URL, RESTAURANTS_BASE_URL, VENUE_DYNAMIC_BASE_URL } from '../wolt.config';

type WoltCity = {
  readonly lat: number;
  readonly lon: number;
  readonly areaSlug: string;
};

export type VenueStatus = {
  readonly isOnline: boolean;
  readonly isOpen: boolean;
};

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'app-language': 'en',
  Origin: 'https://wolt.com',
  Referer: 'https://wolt.com/',
};

const MAX_RETRIES_ON_RATE_LIMIT = 3;
const BASE_BACKOFF_MS = 2000;

// Wolt's consumer-api enforces a per-IP burst rate limit (~16 quick requests) at the CloudFront/WAF layer and
// returns 429 when exceeded. The limit is host-wide and request-count based, so multiple callers (search,
// mini-app, subscription alerting) can collectively trip it. We funnel every Wolt request through a single
// serialized queue with a minimum spacing between requests so nothing can ever burst past the limit.
const MIN_INTERVAL_BETWEEN_REQUESTS_MS = 1500;
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
      await sleep(BASE_BACKOFF_MS * 2 ** attempt);
    }
  }
  throw lastErr;
}

export function buildRestaurantLink(area: string, slug: string): string {
  return RESTAURANT_LINK_BASE_URL.replace('{area}', area).replace('{slug}', slug);
}

// Lightweight per-venue status check (~17KB) used by the subscription alerting flow so we don't fetch entire
// city lists (~3MB each) every cycle. Returns null when the venue could not be fetched.
export async function getVenueStatus(slug: string): Promise<VenueStatus | null> {
  const logger = new Logger(getVenueStatus.name);
  try {
    const data = await getWithRetry<any>(VENUE_DYNAMIC_BASE_URL.replace('{slug}', slug));
    const venue = data?.venue ?? {};
    return { isOnline: Boolean(venue.online), isOpen: Boolean(venue.open_status?.is_open) };
  } catch (err) {
    logger.error(`${getVenueStatus.name} - err - ${slug} - ${err}`);
    return null;
  }
}

export async function getRestaurantsList(): Promise<WoltRestaurant[]> {
  const logger = new Logger(getRestaurantsList.name);
  try {
    const cities = await getCitiesList();

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
      const link = buildRestaurantLink(area, slug);
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
