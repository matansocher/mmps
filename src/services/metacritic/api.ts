import { BROWSER_USER_AGENT, GAME_TYPE_ID, METACRITIC_BACKEND_URL, METACRITIC_SITE_URL, REQUEST_TIMEOUT_MS } from './constants';
import type {
  MetacriticGame,
  MetacriticGameResponse,
  MetacriticNamedResponse,
  MetacriticScore,
  MetacriticScoreSummaryResponse,
  MetacriticSearchResponse,
  MetacriticSearchResult,
  MetacriticUserScoreResponse,
} from './types';

async function metacriticRequest<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(`${METACRITIC_BACKEND_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    headers: { 'user-agent': BROWSER_USER_AGENT, accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Metacritic request failed: HTTP ${response.status} for ${path}`);
  }
  return (await response.json()) as T;
}

function toNames(items: readonly MetacriticNamedResponse[] | undefined): string[] {
  return (items ?? []).map((item) => item.name).filter(Boolean);
}

function toScore(summary: MetacriticScoreSummaryResponse | undefined, defaultMax: number): MetacriticScore {
  return {
    score: summary?.score ?? null,
    max: summary?.max ?? defaultMax,
    reviewCount: summary?.reviewCount ?? null,
    sentiment: summary?.sentiment ?? null,
  };
}

export function buildGameUrl(slug: string): string {
  return `${METACRITIC_SITE_URL}/game/${slug}/`;
}

// Metacritic's search is fuzzy, so misspelled names ("zelda breth") still return the right games.
export async function searchGames(query: string, limit = 5): Promise<MetacriticSearchResult[]> {
  const params = { offset: '0', limit: String(limit), mcoTypeId: String(GAME_TYPE_ID) };
  const response = await metacriticRequest<MetacriticSearchResponse>(`/finder/metacritic/search/${encodeURIComponent(query)}/web`, params);
  const items = response?.data?.items ?? [];

  return items
    .filter((item) => !item.type || item.type === 'game-title')
    .map((item) => ({
      slug: item.slug,
      title: item.title,
      criticScore: item.criticScoreSummary?.score ?? null,
      releaseDate: item.releaseDate ?? null,
      platforms: toNames(item.platforms),
      genres: toNames(item.genres),
      url: buildGameUrl(item.slug),
    }));
}

export async function getGame(slug: string): Promise<MetacriticGame | null> {
  const [gameResponse, userScoreResponse] = await Promise.all([
    metacriticRequest<MetacriticGameResponse>(`/games/metacritic/${slug}/web`),
    metacriticRequest<MetacriticUserScoreResponse>(`/reviews/metacritic/user/games/${slug}/stats/web`).catch(() => null),
  ]);

  const item = gameResponse?.data?.item;
  if (!item) {
    return null;
  }

  const companies = item.production?.companies ?? [];
  const companyNames = (typeName: string) => [...new Set(companies.filter((company) => company.typeName === typeName).map((company) => company.name))].filter(Boolean);
  const userScore = userScoreResponse?.data?.item;

  return {
    slug: item.slug,
    title: item.title,
    description: item.description ?? null,
    releaseDate: item.releaseDate ?? null,
    rating: item.rating ?? null,
    genres: toNames(item.genres),
    developers: companyNames('Developer'),
    publishers: companyNames('Publisher'),
    mustPlay: !!item.mustPlay,
    criticScore: toScore(item.criticScoreSummary, 100),
    userScore: userScore ? toScore(userScore, 10) : null,
    platforms: (item.platforms ?? []).map((platform) => ({
      platform: platform.name,
      criticScore: platform.criticScoreSummary?.score ?? null,
      reviewCount: platform.criticScoreSummary?.reviewCount ?? null,
    })),
    url: buildGameUrl(item.slug),
  };
}
