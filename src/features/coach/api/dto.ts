import { isValid, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { COMPETITIONS } from '@services/scores-365';
import type { DashboardEventType, DashboardFavoriteTeam, DashboardLanguage, DashboardPreferencesUpdate } from '@shared/coach';
import { DASHBOARD_EVENT_TYPES, DASHBOARD_LANGUAGES, MAX_DASHBOARD_DAY_OFFSET, MAX_FAVORITE_TEAMS } from './constants';
import { daysBetween } from './dates';

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
  const { competitionIds, favoriteTeams, eventTypes, language } = body as Record<string, unknown>;
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
    ...(parseLanguage(language) ? { language: parseLanguage(language) } : {}),
  };
}

export function parseLanguage(value: unknown): DashboardLanguage | undefined {
  return DASHBOARD_LANGUAGES.includes(value as DashboardLanguage) ? (value as DashboardLanguage) : undefined;
}

// undefined when absent (the server picks the day), null when malformed or out of the browsable range.
export function parseDashboardDate(value: unknown, now = new Date()): string | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !isValid(parseISO(value))) return null;
  const today = formatInTimeZone(now, DEFAULT_TIMEZONE, 'yyyy-MM-dd');
  return Math.abs(daysBetween(today, value)) <= MAX_DASHBOARD_DAY_OFFSET ? value : null;
}
