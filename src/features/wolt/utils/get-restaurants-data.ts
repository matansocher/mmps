import axios from 'axios';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import type { WoltRestaurant } from '@shared/wolt';
import { CITIES_BASE_URL, CITIES_SLUGS_SUPPORTED, RESTAURANT_LINK_BASE_URL, RESTAURANTS_BASE_URL } from '../wolt.config';

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

export async function getRestaurantsList(): Promise<WoltRestaurant[]> {
  const logger = new Logger(getRestaurantsList.name);
  try {
    const cities = await getCitiesList();
    const responses = await Promise.all(cities.map(({ lat, lon }: WoltCity) => axios.get(buildRestaurantsUrl(lat, lon))));

    const restaurantsWithArea = responses
      .map((res, index) => {
        const restaurants = res.data.sections[1].items;
        restaurants.map((restaurant) => (restaurant.area = cities[index].areaSlug));
        return restaurants;
      })
      .flat();

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
    logger.error(`${getCitiesList.name} - err - ${err}`);
    return [];
  }
}
