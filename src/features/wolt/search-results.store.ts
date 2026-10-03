import { randomUUID } from 'node:crypto';
import { SEARCH_RESULTS_TTL_MS } from './wolt.config';

type SearchResults = {
  readonly restaurantIds: string[];
  readonly createdAt: number;
};

// Ranked results are kept per search so paging doesn't re-run the search + AI ranking, and the page buttons only
// carry a short id instead of the raw search text (callback_data is limited to 64 bytes)
const searches = new Map<string, SearchResults>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, search] of searches) {
    if (now - search.createdAt > SEARCH_RESULTS_TTL_MS) searches.delete(id);
  }
}

export function saveSearchResults(restaurantIds: string[]): string {
  pruneExpired();
  const id = randomUUID().slice(0, 8);
  searches.set(id, { restaurantIds, createdAt: Date.now() });
  return id;
}

export function getSearchResults(id: string): string[] | null {
  const search = searches.get(id);
  if (!search || Date.now() - search.createdAt > SEARCH_RESULTS_TTL_MS) return null;
  return search.restaurantIds;
}
