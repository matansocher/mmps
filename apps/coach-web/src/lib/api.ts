import { createJsonRequester } from '@mmps/web-api';
import type { AthleteDetailResponse, CompetitionDetailResponse, CompetitionsListResponse, FollowUpdateResponse, MatchDetailResponse, TeamDetailResponse, TodayResponse } from '../types';
import { getInitData } from './telegram';

const request = createJsonRequester({
  headers: () => ({
    'X-Telegram-Init-Data': getInitData(),
  }),
});

export const api = {
  open: () => request<void>('/api/coach/open', { method: 'POST' }),
  today: (date?: string) => request<TodayResponse>(date ? `/api/coach/today?date=${encodeURIComponent(date)}` : '/api/coach/today'),
  competitions: () => request<CompetitionsListResponse>('/api/coach/competitions'),
  competition: (id: number) => request<CompetitionDetailResponse>(`/api/coach/competitions/${id}`),
  match: (id: number) => request<MatchDetailResponse>(`/api/coach/matches/${id}`),
  team: (id: number) => request<TeamDetailResponse>(`/api/coach/teams/${id}`),
  athlete: (id: number) => request<AthleteDetailResponse>(`/api/coach/athletes/${id}`),
  setFollow: (id: number, follow: boolean) =>
    request<FollowUpdateResponse>(`/api/coach/competitions/${id}/follow`, {
      method: 'POST',
      body: JSON.stringify({ follow }),
    }),
};
