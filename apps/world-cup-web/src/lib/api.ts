import { getInitData } from './telegram';
import type { GroupStandings, GuessResponse, H2HDto, LeaderboardDto, MatchDetailResponse, MatchDto, ProfileDto } from './types';

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
  matches: () => request<{ matches: MatchDto[] }>('/api/world-cup/matches'),
  matchDetail: (id: number) => request<MatchDetailResponse>(`/api/world-cup/matches/${id}`),
  matchH2H: (id: number) => request<H2HDto>(`/api/world-cup/matches/${id}/h2h`),
  upcoming: () => request<{ matches: MatchDto[] }>('/api/world-cup/matches/upcoming'),
  submitGuess: (matchId: number, home: number, away: number) =>
    request<GuessResponse>('/api/world-cup/guess', {
      method: 'POST',
      body: JSON.stringify({ matchId, home, away }),
    }),
  leaderboard: () => request<LeaderboardDto>('/api/world-cup/leaderboard'),
  profile: () => request<ProfileDto>('/api/world-cup/profile'),
  standings: () => request<{ standings: GroupStandings[] }>('/api/world-cup/standings'),
  setNotifications: (enabled: boolean) =>
    request<{ success: boolean }>('/api/world-cup/profile/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  setDisplayName: (displayName: string) =>
    request<{ success: boolean; displayName: string }>('/api/world-cup/profile/display-name', {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    }),
};
