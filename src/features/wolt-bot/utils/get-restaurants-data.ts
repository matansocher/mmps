import axios from 'axios';
import { Logger } from '@nestjs/common';
import { getErrorMessage } from '@core/utils';
import type { WoltRestaurant } from '../interface';
import { CITIES_BASE_URL, CITIES_SLUGS_SUPPORTED, RESTAURANT_LINK_BASE_URL, RESTAURANTS_BASE_URL } from '../wolt-bot.config';

interface WoltCity {
  readonly lat: number;
  readonly lon: number;
  readonly areaSlug: string;
}

export async function getRestaurantsList(): Promise<WoltRestaurant[]> {
  const logger = new Logger(getRestaurantsList.name);
  try {
    const cities = await getCitiesList();
    const responses = await Promise.all(cities.map(({ lat, lon }: WoltCity) => axios.get(`${RESTAURANTS_BASE_URL}?lat=${lat}&lon=${lon}`)));

    const restaurantsWithArea = responses
      .map((res, index) => {
        const restaurants = res.data.sections[1].items;
        restaurants.map((restaurant) => (restaurant.area = cities[index].areaSlug));
        return restaurants;
      })
      .flat();

    return restaurantsWithArea.map((restaurant) => {
      return {
        id: restaurant.venue.id,
        name: restaurant.title,
        isOnline: restaurant.venue.online,
        slug: restaurant.venue.slug,
        area: restaurant.area,
        photo: restaurant.image.url,
        link: RESTAURANT_LINK_BASE_URL.replace('{area}', restaurant.area).replace('{slug}', restaurant.venue.slug),
      } as WoltRestaurant;
    });
  } catch (err) {
    logger.error(`err - ${getErrorMessage(err)}`);
    return [];
  }
}

async function getCitiesList(): Promise<WoltCity[]> {
  const logger = new Logger(getCitiesList.name);
  try {
    const result = await axios.get(CITIES_BASE_URL);
    const rawCities = result['data'].results;
    return rawCities
      .filter((city) => CITIES_SLUGS_SUPPORTED.includes(city.slug))
      .map((city) => {
        return {
          areaSlug: city.slug,
          lon: city.location.coordinates[0],
          lat: city.location.coordinates[1],
        };
      });
  } catch (err) {
    logger.error(`err - ${getErrorMessage(err)}`);
    return [];
  }
}
