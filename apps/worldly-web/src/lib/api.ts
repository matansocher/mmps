import type { GameAnswerResponse, GameMode, GameQuestion, StatsResponse, SubscriptionResponse } from '../types';
import { getInitData } from './telegram';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'X-Telegram-Init-Data': getInitData(),
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`request_failed_${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  open: () => request<void>('/api/worldly/open', { method: 'POST' }),
  newGame: (mode: GameMode) =>
    request<GameQuestion>('/api/worldly/game', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
  answer: (gameId: string, selected: string) =>
    request<GameAnswerResponse>(`/api/worldly/game/${gameId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ selected }),
    }),
  stats: () => request<StatsResponse>('/api/worldly/stats'),
  subscription: () => request<SubscriptionResponse>('/api/worldly/subscription'),
  setSubscription: (isActive: boolean) =>
    request<SubscriptionResponse>('/api/worldly/subscription', {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
};
