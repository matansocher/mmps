import type {
  AdvanceResult,
  AuthConfig,
  BidOutcome,
  Career,
  FixtureRow,
  League,
  LiveMatchSquads,
  LiveMatchView,
  MarketPlayer,
  MarketQuery,
  MeResponse,
  SeasonSummary,
  SessionUser,
  SquadResponse,
  StandingRow,
  Team,
  TopScorer,
  TransfersDashboard,
} from '../types';

const BASE = '/api/football-manager';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    credentials: 'same-origin',
  });
  if (!res.ok) {
    let error = `request_failed_${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) error = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(error);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  authConfig: () => request<AuthConfig>('/auth/config'),
  loginDev: (name: string) => request<{ user: SessionUser }>('/auth/dev', { method: 'POST', body: JSON.stringify({ name }) }),
  loginGoogle: (idToken: string) => request<{ user: SessionUser }>('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<MeResponse>('/me'),
  leagues: () => request<{ leagues: League[] }>('/leagues'),
  teams: (leagueId: number) => request<{ teams: Team[] }>(`/leagues/${leagueId}/teams`),
  createCareer: (clubTeamId: number) => request<{ career: Career }>('/career', { method: 'POST', body: JSON.stringify({ clubTeamId }) }),
  squad: () => request<SquadResponse>('/career/squad'),
  setLineup: (playerIds: number[], formationId?: string) =>
    request<{ lineup: number[]; formationId: string }>('/career/lineup', { method: 'POST', body: JSON.stringify({ playerIds, formationId }) }),
  table: (leagueId?: number) => request<{ standings: StandingRow[]; leagues?: { leagueId: number; name: string }[]; leagueId?: number }>(`/career/table${leagueId ? `?leagueId=${leagueId}` : ''}`),
  fixtures: () => request<{ fixtures: FixtureRow[]; currentMatchday: number; maxMatchday: number }>('/career/fixtures'),
  scorers: () => request<{ scorers: TopScorer[] }>('/career/scorers'),
  seasonSummary: () => request<SeasonSummary>('/career/season-summary'),
  newSeason: () => request<{ career: Career }>('/career/new-season', { method: 'POST' }),
  advance: () => request<AdvanceResult>('/career/advance', { method: 'POST' }),
  matchStart: () => request<{ view: LiveMatchView; squads: LiveMatchSquads }>('/career/match/start', { method: 'POST' }),
  matchState: () => request<{ view: LiveMatchView; squads: LiveMatchSquads }>('/career/match/state'),
  matchTick: (minutes: number, toEnd = false) => request<{ view: LiveMatchView }>('/career/match/tick', { method: 'POST', body: JSON.stringify({ minutes, toEnd }) }),
  matchTactic: (mentality: string) => request<{ view: LiveMatchView }>('/career/match/tactic', { method: 'POST', body: JSON.stringify({ mentality }) }),
  matchSub: (outPlayerId: number, inPlayerId: number) =>
    request<{ view: LiveMatchView; squads: LiveMatchSquads }>('/career/match/sub', { method: 'POST', body: JSON.stringify({ outPlayerId, inPlayerId }) }),
  matchFinish: () => request<AdvanceResult>('/career/match/finish', { method: 'POST' }),
  market: (q: MarketQuery) => {
    const params = new URLSearchParams();
    if (q.name) params.set('name', q.name);
    if (q.position) params.set('position', q.position);
    if (q.leagueId) params.set('leagueId', String(q.leagueId));
    if (q.maxValue) params.set('maxValue', String(q.maxValue));
    if (q.minOverall) params.set('minOverall', String(q.minOverall));
    const qs = params.toString();
    return request<{ players: MarketPlayer[] }>(`/career/market${qs ? `?${qs}` : ''}`);
  },
  transfers: () => request<TransfersDashboard>('/career/transfers'),
  bid: (playerId: number, amount: number) => request<BidOutcome>('/career/bid', { method: 'POST', body: JSON.stringify({ playerId, amount }) }),
  respondBid: (id: string, accept: boolean) => request<{ outcome: string }>(`/career/bid/${id}/respond`, { method: 'POST', body: JSON.stringify({ accept }) }),
  respondOffer: (id: string, accept: boolean) => request<{ outcome: string }>(`/career/offer/${id}/respond`, { method: 'POST', body: JSON.stringify({ accept }) }),
};
