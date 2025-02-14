import { WoltRestaurant } from '../interface';
import { CITIES_SLUGS_SUPPORTED, MAX_NUM_OF_RESTAURANTS_TO_SHOW } from '../wolt-bot.config';

export function filterRestaurantsByName(restaurants: WoltRestaurant[], searchInput: string): WoltRestaurant[] {
  return restaurants
    .filter((restaurant: WoltRestaurant) => {
      return restaurant.name.toLowerCase().includes(searchInput.toLowerCase());
    })
    .sort((a: WoltRestaurant, b: WoltRestaurant) => {
      // sort by the order of areas in CITIES_SLUGS_SUPPORTED
      return CITIES_SLUGS_SUPPORTED.indexOf(a.area) - CITIES_SLUGS_SUPPORTED.indexOf(b.area);
    })
    .slice(0, MAX_NUM_OF_RESTAURANTS_TO_SHOW);
}
