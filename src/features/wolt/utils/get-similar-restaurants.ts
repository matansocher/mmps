import { WoltRestaurant } from '@shared/wolt';
import { MAX_NUM_OF_RESTAURANTS_TO_SHOW } from '../wolt.config';
import { normalize } from './get-restaurants-by-name';

const MIN_FUZZY_WORD_LENGTH = 4;

function levenshtein(a: string, b: string): number {
  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(previousRow[j] + 1, currentRow[j - 1] + 1, previousRow[j - 1] + cost);
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
}

// 4-6 letter words allow one typo, longer words allow two
function getMaxDistance(word: string): number {
  return word.length >= 7 ? 2 : 1;
}

function getWordDistance(searchWord: string, nameWords: string[]): number | null {
  const maxDistance = getMaxDistance(searchWord);
  const distances = nameWords.map((nameWord) => levenshtein(searchWord, nameWord)).filter((distance) => distance <= maxDistance);
  return distances.length ? Math.min(...distances) : null;
}

// typo-tolerant fallback for when getRestaurantsByName finds nothing - sorted by matched words, then by closeness
export function getSimilarRestaurants(restaurants: WoltRestaurant[], searchInput: string): WoltRestaurant[] {
  const searchWords = (searchInput || '')
    .split(/\s+/)
    .map(normalize)
    .filter((word) => word.length >= MIN_FUZZY_WORD_LENGTH);
  if (!searchWords.length) {
    return [];
  }

  return restaurants
    .map((restaurant) => {
      const nameWords = normalize(restaurant.name).split(' ');
      const distances = searchWords.map((word) => getWordDistance(word, nameWords)).filter((distance) => distance !== null);
      return { restaurant, matches: distances.length, distance: distances.reduce((sum, distance) => sum + distance, 0) };
    })
    .filter(({ matches }) => matches > 0)
    .sort((a, b) => b.matches - a.matches || a.distance - b.distance)
    .slice(0, MAX_NUM_OF_RESTAURANTS_TO_SHOW)
    .map(({ restaurant }) => restaurant);
}
