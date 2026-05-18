import { getInitData } from './telegram';
import type { CompetitionDetailResponse, CompetitionsListResponse, FollowUpdateResponse, MatchDetailResponse, TodayResponse } from '../types';

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
  return res.json() as Promise<T>;
}

export const api = {
  today: () => request<TodayResponse>('/api/coach/today'),
  competitions: () => request<CompetitionsListResponse>('/api/coach/competitions'),
  competition: (id: number) => request<CompetitionDetailResponse>(`/api/coach/competitions/${id}`),
  match: (id: number) => request<MatchDetailResponse>(`/api/coach/matches/${id}`),
  setFollow: (id: number, follow: boolean) =>
    request<FollowUpdateResponse>(`/api/coach/competitions/${id}/follow`, {
      method: 'POST',
      body: JSON.stringify({ follow }),
    }),
};
