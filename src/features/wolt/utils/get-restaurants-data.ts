import axios from 'axios';
import { env } from 'node:process';
import { chunk, Logger, sleep } from '@core/utils';
import type { WoltRestaurant } from '@shared/wolt';
import {
  CITIES_BASE_URL,
  CITIES_SLUGS_SUPPORTED,
  DELAY_BETWEEN_RESTAURANTS_BATCHES_MS,
  MAX_CONCURRENT_RESTAURANTS_REQUESTS,
  RELAY_REQUEST_TIMEOUT_MS,
  RESTAURANT_LINK_BASE_URL,
  RESTAURANTS_BASE_URL,
} from '../wolt.config';

type WoltCity = {
  readonly lat: number;
  readonly lon: number;
  readonly areaSlug: string;
};

// Heroku dyno IPs are shared and rate-limited by Wolt's edge, causing immediate 429s on the heavy
// restaurants-list endpoint. When WOLT_RELAY_URL is set, route that fetch through a relay (e.g. a free
// Google Apps Script web app) running on a cleaner egress IP. Falls back to a direct request when unset.
function buildRestaurantsUrl(lat: number, lon: number): string {
  const relayUrl = env.WOLT_RELAY_URL;
  if (relayUrl) {
    const separator = relayUrl.includes('?') ? '&' : '?';
    return `${relayUrl}${separator}lat=${lat}&lon=${lon}`;
  }
  return `${RESTAURANTS_BASE_URL}?lat=${lat}&lon=${lon}`;
}

async function fetchCityRestaurants(city: WoltCity): Promise<WoltRestaurant[]> {
  const url = buildRestaurantsUrl(city.lat, city.lon);
  // Apps Script follows a 302 to a googleusercontent download URL, so the relay needs more than the
  // global 30s axios default to finish a multi-megabyte response.
  const timeout = env.WOLT_RELAY_URL ? RELAY_REQUEST_TIMEOUT_MS : undefined;
  const { data } = await axios.get(url, { timeout });
  const items = data?.sections?.[1]?.items ?? [];

  return items.map((item) => {
    const { venue, title: name, image } = item;
    const { id, online: isOnline, slug, tags, price_range: priceRange, rating, estimate, short_description: shortDescription } = venue;
    const link = RESTAURANT_LINK_BASE_URL.replace('{area}', city.areaSlug).replace('{slug}', slug);
    return {
      id,
      name,
      isOnline,
      slug,
      area: city.areaSlug,
      photo: image.url,
      link,
      tags: Array.isArray(tags) ? tags : undefined,
      priceRange: typeof priceRange === 'number' ? priceRange : undefined,
      rating: rating && typeof rating.score === 'number' ? rating.score : undefined,
      estimateMinutes: typeof estimate === 'number' ? estimate : undefined,
      shortDescription: typeof shortDescription === 'string' ? shortDescription : undefined,
    } as WoltRestaurant;
  });
}

export async function getRestaurantsList(): Promise<WoltRestaurant[]> {
  const logger = new Logger(getRestaurantsList.name);
  try {
    const cities = await getCitiesList();
    const restaurants: WoltRestaurant[] = [];
    const failedAreas: string[] = [];

    // Both the relay (Apps Script serializes invocations) and Wolt's edge (429s on bursts) choke when all
    // cities are requested at once, so walk through them in small batches.
    const batches = chunk(cities, MAX_CONCURRENT_RESTAURANTS_REQUESTS);
    for (const [batchIndex, batch] of batches.entries()) {
      const results = await Promise.allSettled(batch.map((city) => fetchCityRestaurants(city)));
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          restaurants.push(...result.value);
        } else {
          failedAreas.push(`${batch[index].areaSlug} (${result.reason})`);
        }
      });
      if (batchIndex < batches.length - 1) {
        await sleep(DELAY_BETWEEN_RESTAURANTS_BATCHES_MS);
      }
    }

    if (failedAreas.length) {
      logger.warn(`Could not fetch restaurants for areas: ${failedAreas.join(', ')}`);
    }

    return restaurants;
  } catch (err) {
    logger.error(`Failed to fetch restaurants list: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

export async function getAllCities() {
  const result = await axios.get(CITIES_BASE_URL);
  return result?.data?.results || [];
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
    logger.error(`Failed to fetch cities list: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}
