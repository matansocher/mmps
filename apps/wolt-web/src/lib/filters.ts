import { CITY_LABELS_HE } from './cities';
import type { RestaurantItem } from '../types';

export type Filters = {
  readonly city: string | null; // null = all cities
  readonly openOnly: boolean;
  readonly cuisines: ReadonlyArray<string>;
  readonly priceRanges: ReadonlyArray<number>;
  readonly minRating: number | null;
};

export const DEFAULT_FILTERS: Filters = {
  city: null,
  openOnly: true,
  cuisines: [],
  priceRanges: [],
  minRating: null,
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/['"`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchByName(restaurants: ReadonlyArray<RestaurantItem>, query: string): RestaurantItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [...restaurants];
  const words = trimmed.split(/\s+/).map(normalize).filter(Boolean);
  return restaurants.filter((r) => {
    const name = normalize(r.name);
    return words.some((w) => name.includes(w));
  });
}

export function applyFilters(restaurants: ReadonlyArray<RestaurantItem>, filters: Filters): RestaurantItem[] {
  return restaurants.filter((r) => {
    if (filters.openOnly && !r.isOnline) return false;
    if (filters.priceRanges.length > 0 && (r.priceRange == null || !filters.priceRanges.includes(r.priceRange))) return false;
    if (filters.minRating != null && (r.rating == null || r.rating < filters.minRating)) return false;
    if (filters.cuisines.length > 0) {
      const tags = r.tags ?? [];
      if (!filters.cuisines.some((c) => tags.includes(c))) return false;
    }
    return true;
  });
}

// Sort: selected city first (city === selected sorts above), then alphabetical
export function sortByCityFirst(restaurants: ReadonlyArray<RestaurantItem>, city: string | null): RestaurantItem[] {
  if (!city) return [...restaurants];
  return [...restaurants].sort((a, b) => {
    const aMatch = a.area === city ? 0 : 1;
    const bMatch = b.area === city ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.name.localeCompare(b.name);
  });
}

export function listCities(restaurants: ReadonlyArray<RestaurantItem>): string[] {
  const set = new Set<string>();
  for (const r of restaurants) if (r.area) set.add(r.area);
  return [...set].sort();
}

export function listTopCuisines(restaurants: ReadonlyArray<RestaurantItem>, top = 12): string[] {
  const counts = new Map<string, number>();
  for (const r of restaurants) {
    for (const t of r.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([t]) => t);
}

export function formatCityLabel(slug: string): string {
  const he = CITY_LABELS_HE[slug];
  if (he) return he;
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
