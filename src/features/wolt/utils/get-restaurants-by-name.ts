import { WoltRestaurant } from '../types';
import { CITIES_SLUGS_SUPPORTED } from '../wolt.config';

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/['"`\-]/g, '') // remove common special characters
    .replace(/\s+/g, ' ') // normalize whitespace (optional)
    .trim();
}

// sort by the order of areas in CITIES_SLUGS_SUPPORTED
export function getRestaurantsByName(restaurants: WoltRestaurant[], searchInput: string): WoltRestaurant[] {
  if (!searchInput || searchInput.trim() === '') {
    return [];
  }

  const searchWords = searchInput
    .split(/\s+/) // split by whitespace
    .map(normalize)
    .filter(Boolean); // remove empty strings

  return restaurants
    .filter((restaurant: WoltRestaurant) => {
      const normalizedName = normalize(restaurant.name);
      return searchWords.some((word) => normalizedName.includes(word));
    })
    .sort((a: WoltRestaurant, b: WoltRestaurant) => CITIES_SLUGS_SUPPORTED.indexOf(a.area) - CITIES_SLUGS_SUPPORTED.indexOf(b.area));
}
