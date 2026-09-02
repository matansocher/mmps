/**
 * Mindloop backend client.
 *
 * The app runs inside Telegram (where `window.Telegram.WebApp.initData` is a
 * signed payload the server verifies) and also in a plain browser during local
 * dev (where we fall back to a dev-user header the server accepts outside
 * production). When neither identity is available we treat the player as
 * "local only" and never hit the network — localStorage is the source of truth.
 */

export interface PlayEntry {
  gameId: string;
  score: number;
  at: string;
}

export interface PlayerData {
  bestScores: Record<string, number>;
  favorites: string[];
  history: PlayEntry[];
  updatedAt: string | null;
}

interface PlayerResponse {
  player: PlayerData;
}

interface TelegramWebApp {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
}

function telegramWebApp(): TelegramWebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

/** In local dev, allow forcing a player id via `?devUser=` (persisted) so the API is exercisable. */
function devUserId(): string | null {
  if (import.meta.env.PROD) return null;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('devUser');
    if (fromQuery) {
      localStorage.setItem('mindloop:dev-user', fromQuery);
      return fromQuery;
    }
    return localStorage.getItem('mindloop:dev-user');
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> | null {
  const initData = telegramWebApp()?.initData;
  if (initData) return { 'X-Telegram-Init-Data': initData };

  const dev = devUserId();
  if (dev) return { 'X-Mindloop-Dev-User': dev };

  return null;
}

/** Whether this session has a durable (server-backed) identity. */
export function hasRemoteIdentity(): boolean {
  return authHeaders() !== null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = authHeaders();
  if (!headers) throw new Error('no_identity');

  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  if (!response.ok) throw new Error(`request_failed_${response.status}`);
  return body as T;
}

export const mindloopApi = {
  getPlayer: () => request<PlayerResponse>('/api/mindloop/player'),

  recordResult: (gameId: string, score: number) =>
    request<PlayerResponse>('/api/mindloop/player/result', {
      method: 'POST',
      body: JSON.stringify({ gameId, score }),
    }),

  setFavorites: (favorites: string[]) =>
    request<PlayerResponse>('/api/mindloop/player/favorites', {
      method: 'PUT',
      body: JSON.stringify({ favorites }),
    }),

  sync: (snapshot: { bestScores: Record<string, number>; favorites: string[]; history: PlayEntry[] }) =>
    request<PlayerResponse>('/api/mindloop/player/sync', {
      method: 'POST',
      body: JSON.stringify(snapshot),
    }),
};
