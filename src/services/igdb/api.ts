import { getAccessToken, getIgdbHeaders } from './auth';
import { GAME_FIELDS, IGDB_BASE_URL, IGDB_IMAGE_BASE_URL, PLAYSTATION_STORE_CATEGORY_ID, PS5_PLATFORM_ID, RATED_GAME_FIELDS } from './constants';
import type { IgdbExternalGameResponse, IgdbGame, IgdbGameResponse, IgdbRatedGame, IgdbRatedGameResponse } from './types';
import { resolveReleaseInfo } from './utils';

async function igdbRequest<T>(endpoint: string, body: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, { method: 'POST', headers: getIgdbHeaders(token), body });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`IGDB ${endpoint} failed: HTTP ${response.status} - ${text || '(empty body)'}`);
  }
  return JSON.parse(text) as T;
}

function resolvePsStoreProductId(externalGames: readonly IgdbExternalGameResponse[] | undefined): string | null {
  const match = (externalGames ?? []).find((entry) => entry.category === PLAYSTATION_STORE_CATEGORY_ID && entry.uid);
  return match ? match.uid : null;
}

// IGDB sometimes lists the PlayStation Store entry with a page url but no uid mapping. The url still
// carries the concept/product id, so it is kept as a fallback resolved at add time.
function resolvePsStoreUrl(externalGames: readonly IgdbExternalGameResponse[] | undefined): string | null {
  const match = (externalGames ?? []).find((entry) => entry.category === PLAYSTATION_STORE_CATEGORY_ID && entry.url);
  return match ? match.url : null;
}

function toIgdbGame(game: IgdbGameResponse): IgdbGame {
  return {
    id: game.id,
    name: game.name,
    slug: game.slug ?? null,
    coverUrl: game.cover?.image_id ? `${IGDB_IMAGE_BASE_URL}/${game.cover.image_id}.jpg` : null,
    psStoreProductId: resolvePsStoreProductId(game.external_games),
    psStoreUrl: resolvePsStoreUrl(game.external_games),
    release: resolveReleaseInfo(game.release_dates),
  };
}

export async function searchPs5Games(name: string, limit = 5): Promise<IgdbGame[]> {
  const term = name.replace(/"/g, '');
  const body = `search "${term}"; fields ${GAME_FIELDS}; where platforms = (${PS5_PLATFORM_ID}); limit ${limit};`;
  const games = await igdbRequest<IgdbGameResponse[]>('games', body);
  return games.map(toIgdbGame);
}

export async function getPs5GameById(igdbId: number): Promise<IgdbGame | null> {
  const body = `fields ${GAME_FIELDS}; where id = ${igdbId}; limit 1;`;
  const games = await igdbRequest<IgdbGameResponse[]>('games', body);
  return games.length ? toIgdbGame(games[0]) : null;
}

function roundRating(rating: number | undefined): number | null {
  return rating === undefined ? null : Math.round(rating);
}

function toIgdbRatedGame(game: IgdbRatedGameResponse): IgdbRatedGame {
  const companies = game.involved_companies ?? [];
  const companyNames = (role: 'developer' | 'publisher') => companies.filter((entry) => entry[role] && entry.company?.name).map((entry) => entry.company.name);
  return {
    id: game.id,
    name: game.name,
    url: game.url ?? null,
    summary: game.summary ?? null,
    releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10) : null,
    genres: (game.genres ?? []).map((genre) => genre.name).filter(Boolean),
    platforms: (game.platforms ?? []).map((platform) => platform.name).filter(Boolean),
    developers: companyNames('developer'),
    publishers: companyNames('publisher'),
    criticRating: roundRating(game.aggregated_rating),
    criticRatingCount: game.aggregated_rating_count ?? null,
    userRating: roundRating(game.rating),
    userRatingCount: game.rating_count ?? null,
  };
}

// Searches all platforms (not only PS5) and includes critic and user ratings.
export async function searchRatedGames(name: string, limit = 5): Promise<IgdbRatedGame[]> {
  const term = name.replace(/"/g, '');
  const body = `search "${term}"; fields ${RATED_GAME_FIELDS}; limit ${limit};`;
  const games = await igdbRequest<IgdbRatedGameResponse[]>('games', body);
  return games.map(toIgdbRatedGame);
}

export async function getRatedGameById(igdbId: number): Promise<IgdbRatedGame | null> {
  const body = `fields ${RATED_GAME_FIELDS}; where id = ${igdbId}; limit 1;`;
  const games = await igdbRequest<IgdbRatedGameResponse[]>('games', body);
  return games.length ? toIgdbRatedGame(games[0]) : null;
}
