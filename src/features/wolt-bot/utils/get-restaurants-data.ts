import axios from 'axios';
import { getErrorMessage } from '@core/utils';
import type { WoltRestaurant } from '../interface';
import { CITIES_BASE_URL, CITIES_SLUGS_SUPPORTED, RESTAURANTS_BASE_URL } from '../wolt-bot.config';

export async function getRestaurantsList(): Promise<WoltRestaurant[]> {
  try {
    const cities = await getCitiesList();
    const responses = await Promise.all(
      cities.map((city) => {
        const { lat, lon } = city;
        const url = `${RESTAURANTS_BASE_URL}?lat=${lat}&lon=${lon}`;
        return axios.get(url);
      }),
    );

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
      } as WoltRestaurant;
    });
  } catch (err) {
    this.logger.error(`${this.getRestaurantsList.name} - err - ${getErrorMessage(err)}`);
    return [];
  }
}

async function getCitiesList(): Promise<{ areaSlug: string; lon: number; lat: number }[]> {
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
    this.logger.error(`${this.getCitiesList.name} - err - ${getErrorMessage(err)}`);
    return [];
  }
}
