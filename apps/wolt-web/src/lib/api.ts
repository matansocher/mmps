import { getInitData } from './telegram';
import type { PreferencesResponse, RestaurantsListResponse, SubscribeResponse, SubscriptionsListResponse, UnsubscribeResponse } from '../types';

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
  open: () => request<void>('/api/wolt/open', { method: 'POST' }),
  restaurants: () => request<RestaurantsListResponse>('/api/wolt/restaurants'),
  subscriptions: () => request<SubscriptionsListResponse>('/api/wolt/subscriptions'),
  subscribe: (restaurant: string) =>
    request<SubscribeResponse>('/api/wolt/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ restaurant }),
    }),
  unsubscribe: (restaurant: string) =>
    request<UnsubscribeResponse>(`/api/wolt/subscriptions/${encodeURIComponent(restaurant)}`, {
      method: 'DELETE',
    }),
  preferences: () => request<PreferencesResponse>('/api/wolt/preferences'),
  updatePreferences: (city: string | null) =>
    request<PreferencesResponse>('/api/wolt/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ city }),
    }),
};
