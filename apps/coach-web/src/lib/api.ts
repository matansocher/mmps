import type { CompetitionDetail, CompetitionOption, DashboardResponse, GameDetail, PlayerDetail, Preferences, TeamDetail, TeamOption } from '../types';
import { getLanguage } from './i18n';
import { getInitData } from './telegram';

const TOKEN_STORAGE_KEY = 'coach:dashboard-token';

// The bot's browser link carries a private token in ?t=; keep it in localStorage and strip it from the address bar.
export function captureTokenFromUrl(): void {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('t');
  if (!token) return;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage can be unavailable in private mode; the token still works for this page load.
    sessionToken = token;
  }
  url.searchParams.delete('t');
  window.history.replaceState(null, '', url.toString());
}

let sessionToken: string | null = null;

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionToken;
  } catch {
    return sessionToken;
  }
}

function authHeaders(): Record<string, string> {
  const initData = getInitData();
  if (initData) return { 'X-Telegram-Init-Data': initData };
  const token = getStoredToken();
  if (token) return { 'X-Coach-Token': token };
  return {};
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`request_failed_${status}`);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${path}${path.includes('?') ? '&' : '?'}lang=${getLanguage()}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new ApiError(res.status);
  return res.json() as Promise<T>;
}

export const api = {
  dashboard: () => request<DashboardResponse>('/api/coach/dashboard'),
  preferences: () => request<Preferences>('/api/coach/preferences'),
  savePreferences: (preferences: Preferences) => request<Preferences>('/api/coach/preferences', { method: 'PUT', body: JSON.stringify(preferences) }),
  competitions: () => request<CompetitionOption[]>('/api/coach/competitions'),
  searchTeams: (query: string) => request<TeamOption[]>(`/api/coach/teams/search?q=${encodeURIComponent(query)}`),
  game: (id: number) => request<GameDetail>(`/api/coach/games/${id}`),
  team: (id: number) => request<TeamDetail>(`/api/coach/teams/${id}`),
  player: (id: number) => request<PlayerDetail>(`/api/coach/players/${id}`),
  competition: (id: number) => request<CompetitionDetail>(`/api/coach/competitions/${id}`),
};
