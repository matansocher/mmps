import { COMPETITIONS } from '@services/scores-365';
import type { DashboardEventType, DashboardFavoriteTeam, DashboardPreferencesUpdate } from '@shared/coach';
import { DASHBOARD_EVENT_TYPES, DEFAULT_REFRESH_INTERVAL_SEC, MAX_FAVORITE_TEAMS, MAX_REFRESH_INTERVAL_SEC, MIN_REFRESH_INTERVAL_SEC } from './constants';

const KNOWN_COMPETITION_IDS = new Set(COMPETITIONS.map((c) => c.id));

function parseFavoriteTeam(value: unknown): DashboardFavoriteTeam | null {
  if (!value || typeof value !== 'object') return null;
  const { id, name } = value as Record<string, unknown>;
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) return null;
  if (typeof name !== 'string' || !name.trim()) return null;
  return { id, name: name.trim().slice(0, 80) };
}

export function parsePreferencesBody(body: unknown): DashboardPreferencesUpdate | null {
  if (!body || typeof body !== 'object') return null;
  const { competitionIds, favoriteTeams, eventTypes, refreshIntervalSec } = body as Record<string, unknown>;
  if (!Array.isArray(competitionIds) || !Array.isArray(favoriteTeams) || !Array.isArray(eventTypes)) return null;

  const competitions = [...new Set(competitionIds.filter((id): id is number => typeof id === 'number' && KNOWN_COMPETITION_IDS.has(id)))];
  const teams = new Map<number, DashboardFavoriteTeam>();
  for (const raw of favoriteTeams) {
    const team = parseFavoriteTeam(raw);
    if (team) teams.set(team.id, team);
  }
  const types = [...new Set(eventTypes.filter((t): t is DashboardEventType => DASHBOARD_EVENT_TYPES.includes(t as DashboardEventType)))];

  return {
    competitionIds: competitions,
    favoriteTeams: [...teams.values()].slice(0, MAX_FAVORITE_TEAMS),
    eventTypes: types,
    refreshIntervalSec: parseRefreshInterval(refreshIntervalSec),
  };
}

export function parseRefreshInterval(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_REFRESH_INTERVAL_SEC;
  return Math.min(MAX_REFRESH_INTERVAL_SEC, Math.max(MIN_REFRESH_INTERVAL_SEC, Math.round(value)));
}
