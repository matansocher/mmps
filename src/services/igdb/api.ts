import { getAccessToken, getIgdbHeaders } from './auth';
import { GAME_FIELDS, IGDB_BASE_URL, IGDB_IMAGE_BASE_URL, PS5_PLATFORM_ID } from './constants';
import type { IgdbGame, IgdbGameResponse } from './types';
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

function toIgdbGame(game: IgdbGameResponse): IgdbGame {
  return {
    id: game.id,
    name: game.name,
    slug: game.slug ?? null,
    coverUrl: game.cover?.image_id ? `${IGDB_IMAGE_BASE_URL}/${game.cover.image_id}.jpg` : null,
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
