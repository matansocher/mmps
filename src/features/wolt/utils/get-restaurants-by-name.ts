import { WoltRestaurant } from '../interface';
import { CITIES_SLUGS_SUPPORTED, MAX_NUM_OF_RESTAURANTS_TO_SHOW } from '../wolt.config';

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/['"`\-]/g, '') // remove common special characters
    .replace(/\s+/g, ' ') // normalize whitespace (optional)
    .trim();
}

// sort by the order of areas in CITIES_SLUGS_SUPPORTED
export function getRestaurantsByName(restaurants: WoltRestaurant[], searchInput: string): WoltRestaurant[] {
  const normalizedSearch = normalize(searchInput);

  return (
    restaurants
      // .filter((restaurant: WoltRestaurant) => restaurant.name.toLowerCase().includes(searchInput.toLowerCase()))
      .filter((restaurant: WoltRestaurant) => normalize(restaurant.name).includes(normalizedSearch))
      .sort((a: WoltRestaurant, b: WoltRestaurant) => CITIES_SLUGS_SUPPORTED.indexOf(a.area) - CITIES_SLUGS_SUPPORTED.indexOf(b.area))
      .slice(0, MAX_NUM_OF_RESTAURANTS_TO_SHOW)
  );
}
