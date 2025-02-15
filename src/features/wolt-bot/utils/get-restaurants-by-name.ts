import { WoltRestaurant } from '../interface';
import { CITIES_SLUGS_SUPPORTED, MAX_NUM_OF_RESTAURANTS_TO_SHOW } from '../wolt-bot.config';

// sort by the order of areas in CITIES_SLUGS_SUPPORTED
export function getRestaurantsByName(restaurants: WoltRestaurant[], searchInput: string): WoltRestaurant[] {
  return restaurants
    .filter((restaurant: WoltRestaurant) => restaurant.name.toLowerCase().includes(searchInput.toLowerCase()))
    .sort((a: WoltRestaurant, b: WoltRestaurant) => CITIES_SLUGS_SUPPORTED.indexOf(a.area) - CITIES_SLUGS_SUPPORTED.indexOf(b.area))
    .slice(0, MAX_NUM_OF_RESTAURANTS_TO_SHOW);
}
