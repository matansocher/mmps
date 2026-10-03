import { WoltRestaurant } from '@shared/wolt';
import { CITIES_SLUGS_SUPPORTED } from '../wolt.config';

const MIN_SEARCH_WORD_LENGTH = 3;
const WOLT_LINK_REGEX = /wolt\.com\/\S*?\/(?:restaurant|venue)\/([^/?#\s]+)/i;

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/['"`?!,.-]/g, '') // remove common special characters
    .replace(/\s+/g, ' ') // normalize whitespace (optional)
    .trim();
}

function compareAreas(a: WoltRestaurant, b: WoltRestaurant): number {
  return CITIES_SLUGS_SUPPORTED.indexOf(a.area) - CITIES_SLUGS_SUPPORTED.indexOf(b.area);
}

// Short words ("a", "to", "in") are contained in almost every name, so they are dropped unless the whole search is short
function getSearchWords(searchInput: string): string[] {
  const words = searchInput.split(/\s+/).map(normalize).filter(Boolean);
  const longWords = words.filter((word) => word.length >= MIN_SEARCH_WORD_LENGTH);
  return longWords.length ? longWords : words;
}

// sorted by number of matched words, then by the order of areas in CITIES_SLUGS_SUPPORTED
export function getRestaurantsByName(restaurants: WoltRestaurant[], searchInput: string): WoltRestaurant[] {
  if (!searchInput || searchInput.trim() === '') {
    return [];
  }

  const linkSlug = searchInput.match(WOLT_LINK_REGEX)?.[1]?.toLowerCase();
  if (linkSlug) {
    return restaurants.filter((restaurant) => restaurant.slug?.toLowerCase() === linkSlug).sort(compareAreas);
  }

  const searchWords = getSearchWords(searchInput);

  return restaurants
    .map((restaurant) => {
      const normalizedName = normalize(restaurant.name);
      return { restaurant, matches: searchWords.filter((word) => normalizedName.includes(word)).length };
    })
    .filter(({ matches }) => matches > 0)
    .sort((a, b) => b.matches - a.matches || compareAreas(a.restaurant, b.restaurant))
    .map(({ restaurant }) => restaurant);
}
