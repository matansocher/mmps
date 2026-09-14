import type { LearnerProgress } from './types';

// Learner backend client. Mirrors the mindloop pattern: verified Telegram initData
// inside Telegram, a dev-user header in local dev, and "local only" (no network)
// when neither identity is available (localStorage is then the source of truth).

type LearnerProgressResponse = { progress: LearnerProgress };

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
};

function telegramWebApp(): TelegramWebApp | undefined {
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
}

function devUserId(): string | null {
  if (import.meta.env.PROD) return null;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('devUser');
    if (fromQuery) {
      localStorage.setItem('learner:dev-user', fromQuery);
      return fromQuery;
    }
    return localStorage.getItem('learner:dev-user');
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> | null {
  const initData = telegramWebApp()?.initData;
  if (initData) return { 'X-Telegram-Init-Data': initData };

  const dev = devUserId();
  if (dev) return { 'X-Learner-Dev-User': dev };

  return null;
}

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

export const learnerApi = {
  getProgress: () => request<LearnerProgressResponse>('/api/learner/progress'),

  // Non-destructive server merge; returns the merged canonical progress.
  sync: (progress: LearnerProgress) =>
    request<LearnerProgressResponse>('/api/learner/progress/sync', {
      method: 'POST',
      body: JSON.stringify(progress),
    }),
};

export function readTelegramTheme(): 'light' | 'dark' | null {
  const wa = telegramWebApp() as (TelegramWebApp & { colorScheme?: string }) | undefined;
  if (wa?.colorScheme === 'dark' || wa?.colorScheme === 'light') return wa.colorScheme;
  return null;
}
