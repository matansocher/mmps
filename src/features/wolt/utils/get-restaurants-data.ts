import axios, { AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { env } from 'node:process';
import { Logger } from '@core/utils';
import type { WoltRestaurant } from '@shared/wolt';
import { CITIES_BASE_URL, CITIES_SLUGS_SUPPORTED, RESTAURANT_LINK_BASE_URL, RESTAURANTS_BASE_URL } from '../wolt.config';

type WoltCity = {
  readonly lat: number;
  readonly lon: number;
  readonly areaSlug: string;
};

// Wolt's consumer API rate-limits/blocks requests coming from datacenter IP ranges (e.g. Heroku) at its
// CloudFront/WAF edge, returning 429 immediately regardless of request volume - while the same requests from a
// residential IP succeed. Set WOLT_PROXY_URL to a proxy with a clean/residential (ideally Israeli) IP to route
// all Wolt traffic through it. When unset, requests go out directly (fine for local dev on a residential IP).
const WOLT_PROXY_URL = env.WOLT_PROXY_URL;
const proxyAgent = WOLT_PROXY_URL ? new HttpsProxyAgent(WOLT_PROXY_URL) : undefined;

const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'app-language': 'en',
  Origin: 'https://wolt.com',
  Referer: 'https://wolt.com/',
};

const requestConfig: AxiosRequestConfig = {
  headers: REQUEST_HEADERS,
  ...(proxyAgent ? { httpsAgent: proxyAgent, proxy: false as const } : {}),
};

export async function getRestaurantsList(): Promise<WoltRestaurant[]> {
  const logger = new Logger(getRestaurantsList.name);
  try {
    const cities = await getCitiesList();
    const responses = await Promise.all(cities.map(({ lat, lon }: WoltCity) => axios.get(`${RESTAURANTS_BASE_URL}?lat=${lat}&lon=${lon}`, requestConfig)));

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
  const result = await axios.get(CITIES_BASE_URL, requestConfig);
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
