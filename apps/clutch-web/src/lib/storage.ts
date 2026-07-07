import type { League } from '../types';
import { dateKey } from './daily';
import { LEAGUES, type LeagueSelection } from './leagues';

export type DailyRecord = {
  readonly year: number;
  readonly score: number;
  readonly maxScore: number;
  readonly correctCount: number;
  readonly total: number;
  readonly flags: readonly boolean[]; // per-series correctness, in play order
};

export type LeagueStats = {
  dailyStreak: number;
  bestDailyStreak: number;
  lastPlayedDate: string | null;
  bestBracketScore: number;
  bestDecadeScore: number;
  bestRapidStreak: number;
  bestLiftedStreak: number;
  bestFinalistsScore: number;
  bestChumpStreak: number;
  dailyResults: Record<string, DailyRecord>;
};

export type Profile = {
  leagues: Record<LeagueSelection, LeagueStats>;
  daily: DailyClutchState;
  grid: GridState;
};

// ── Clutch Daily ──────────────────────────────────────────────────────────
export type DailyClutchResult = {
  readonly dateKey: string;
  readonly dayNumber: number;
  readonly correct: number;
  readonly total: number;
  readonly flags: readonly boolean[]; // per-question correctness, in play order
  readonly leagues: readonly League[]; // tournament of each question, in play order
};

export type DailyClutchState = {
  currentStreak: number;
  bestStreak: number;
  lastCompletedKey: string | null;
  results: Record<string, DailyClutchResult>;
};

// ── Clutch Grid ───────────────────────────────────────────────────────────
export type GridResult = {
  readonly dateKey: string;
  readonly dayNumber: number;
  readonly filled: number; // correct cells (0..9)
  readonly score: number; // filled base + rarity
  readonly cells: readonly boolean[]; // per-cell correctness, row-major (9)
};

export type GridState = {
  currentStreak: number;
  bestStreak: number;
  bestScore: number;
  bestFilled: number;
  lastCompletedKey: string | null;
  results: Record<string, GridResult>;
};

const KEY = 'playoffiq.profile.v2';

function emptyStats(): LeagueStats {
  return {
    dailyStreak: 0,
    bestDailyStreak: 0,
    lastPlayedDate: null,
    bestBracketScore: 0,
    bestDecadeScore: 0,
    bestRapidStreak: 0,
    bestLiftedStreak: 0,
    bestFinalistsScore: 0,
    bestChumpStreak: 0,
    dailyResults: {},
  };
}

const LEAGUE_IDS = [...(Object.keys(LEAGUES) as League[]), 'all'] as LeagueSelection[];

function emptyDaily(): DailyClutchState {
  return { currentStreak: 0, bestStreak: 0, lastCompletedKey: null, results: {} };
}

function emptyGrid(): GridState {
  return { currentStreak: 0, bestStreak: 0, bestScore: 0, bestFilled: 0, lastCompletedKey: null, results: {} };
}

function emptyProfile(): Profile {
  return {
    leagues: Object.fromEntries(LEAGUE_IDS.map((id) => [id, emptyStats()])) as Record<LeagueSelection, LeagueStats>,
    daily: emptyDaily(),
    grid: emptyGrid(),
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw) as Partial<Profile>;
    const base = emptyProfile();
    return {
      leagues: Object.fromEntries(LEAGUE_IDS.map((id) => [id, { ...base.leagues[id], ...(parsed.leagues?.[id] ?? {}) }])) as Record<LeagueSelection, LeagueStats>,
      daily: { ...base.daily, ...(parsed.daily ?? {}) },
      grid: { ...base.grid, ...(parsed.grid ?? {}) },
    };
  } catch {
    return emptyProfile();
  }
}

function save(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function statsFor(p: Profile, league: LeagueSelection): LeagueStats {
  return p.leagues[league];
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86400000);
}

export function todaysRecord(p: Profile, league: LeagueSelection, date = new Date()): DailyRecord | undefined {
  return p.leagues[league].dailyResults[dateKey(date)];
}

// Records today's daily result and updates streak + bests. Idempotent for the same day.
export function recordDaily(league: LeagueSelection, record: DailyRecord, date = new Date()): Profile {
  const p = loadProfile();
  const stats = p.leagues[league];
  const key = dateKey(date);
  const alreadyPlayed = Boolean(stats.dailyResults[key]);

  stats.dailyResults[key] = record;
  stats.bestBracketScore = Math.max(stats.bestBracketScore, record.score);

  if (!alreadyPlayed) {
    if (stats.lastPlayedDate && daysBetween(stats.lastPlayedDate, key) === 1) {
      stats.dailyStreak += 1;
    } else if (stats.lastPlayedDate === key) {
      // same day — leave streak
    } else {
      stats.dailyStreak = 1;
    }
    stats.lastPlayedDate = key;
    stats.bestDailyStreak = Math.max(stats.bestDailyStreak, stats.dailyStreak);
  }

  save(p);
  return p;
}

// Records a Decade Champions round, keeping the user's best correct-match count.
export function recordDecade(league: LeagueSelection, score: number): Profile {
  const p = loadProfile();
  const stats = p.leagues[league];
  stats.bestDecadeScore = Math.max(stats.bestDecadeScore, score);
  save(p);
  return p;
}

// Records a Rapid Fire run, keeping the user's longest streak.
export function recordRapid(league: LeagueSelection, streak: number): Profile {
  const p = loadProfile();
  const stats = p.leagues[league];
  stats.bestRapidStreak = Math.max(stats.bestRapidStreak, streak);
  save(p);
  return p;
}

// Records a Who Lifted It? run, keeping the user's longest streak.
export function recordLifted(league: LeagueSelection, streak: number): Profile {
  const p = loadProfile();
  const stats = p.leagues[league];
  stats.bestLiftedStreak = Math.max(stats.bestLiftedStreak, streak);
  save(p);
  return p;
}

// Records a Both Finalists round, keeping the user's best total score.
export function recordFinalists(league: LeagueSelection, score: number): Profile {
  const p = loadProfile();
  const stats = p.leagues[league];
  stats.bestFinalistsScore = Math.max(stats.bestFinalistsScore, score);
  save(p);
  return p;
}

// Records a Champion or Chump? run, keeping the user's longest correct streak.
export function recordChump(league: LeagueSelection, streak: number): Profile {
  const p = loadProfile();
  const stats = p.leagues[league];
  stats.bestChumpStreak = Math.max(stats.bestChumpStreak, streak);
  save(p);
  return p;
}

// ── Clutch Daily ──────────────────────────────────────────────────────────

// Today's Clutch Daily result, if the player has already taken it.
export function dailyClutchToday(p: Profile, date = new Date()): DailyClutchResult | undefined {
  return p.daily.results[dateKey(date)];
}

// The streak that's still "alive" today — i.e. the run continues if the last
// completed day was today or yesterday, otherwise it has lapsed to 0.
export function liveDailyStreak(p: Profile, date = new Date()): number {
  const last = p.daily.lastCompletedKey;
  if (!last) return 0;
  const gap = daysBetween(last, dateKey(date));
  return gap === 0 || gap === 1 ? p.daily.currentStreak : 0;
}

// Records today's Clutch Daily. One attempt per day — subsequent calls are ignored.
export function recordDailyClutch(result: DailyClutchResult, date = new Date()): Profile {
  const p = loadProfile();
  const d = p.daily;
  const key = dateKey(date);
  if (d.results[key]) return p;

  d.results[key] = result;
  if (d.lastCompletedKey && daysBetween(d.lastCompletedKey, key) === 1) {
    d.currentStreak += 1;
  } else {
    d.currentStreak = 1;
  }
  d.lastCompletedKey = key;
  d.bestStreak = Math.max(d.bestStreak, d.currentStreak);

  save(p);
  return p;
}

// ── Clutch Grid records ────────────────────────────────────────────────────

export function gridToday(p: Profile, date = new Date()): GridResult | undefined {
  return p.grid.results[dateKey(date)];
}

export function liveGridStreak(p: Profile, date = new Date()): number {
  const last = p.grid.lastCompletedKey;
  if (!last) return 0;
  const gap = daysBetween(last, dateKey(date));
  return gap === 0 || gap === 1 ? p.grid.currentStreak : 0;
}

// Records today's Clutch Grid. One attempt per day — subsequent calls are ignored.
export function recordGrid(result: GridResult, date = new Date()): Profile {
  const p = loadProfile();
  const g = p.grid;
  const key = dateKey(date);
  if (g.results[key]) return p;

  g.results[key] = result;
  if (g.lastCompletedKey && daysBetween(g.lastCompletedKey, key) === 1) {
    g.currentStreak += 1;
  } else {
    g.currentStreak = 1;
  }
  g.lastCompletedKey = key;
  g.bestStreak = Math.max(g.bestStreak, g.currentStreak);
  g.bestScore = Math.max(g.bestScore, result.score);
  g.bestFilled = Math.max(g.bestFilled, result.filled);

  save(p);
  return p;
}
