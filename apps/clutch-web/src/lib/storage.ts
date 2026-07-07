import type { League } from '../types';
import { dateKey } from './daily';
import { LEAGUES } from './leagues';

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
  dailyResults: Record<string, DailyRecord>;
};

export type Profile = {
  leagues: Record<League, LeagueStats>;
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
    dailyResults: {},
  };
}

const LEAGUE_IDS = Object.keys(LEAGUES) as League[];

function emptyProfile(): Profile {
  return { leagues: Object.fromEntries(LEAGUE_IDS.map((id) => [id, emptyStats()])) as Record<League, LeagueStats> };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw) as Partial<Profile>;
    const base = emptyProfile();
    return {
      leagues: Object.fromEntries(LEAGUE_IDS.map((id) => [id, { ...base.leagues[id], ...(parsed.leagues?.[id] ?? {}) }])) as Record<League, LeagueStats>,
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

export function statsFor(p: Profile, league: League): LeagueStats {
  return p.leagues[league];
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86400000);
}

export function todaysRecord(p: Profile, league: League, date = new Date()): DailyRecord | undefined {
  return p.leagues[league].dailyResults[dateKey(date)];
}

// Records today's daily result and updates streak + bests. Idempotent for the same day.
export function recordDaily(league: League, record: DailyRecord, date = new Date()): Profile {
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
export function recordDecade(league: League, score: number): Profile {
  const p = loadProfile();
  const stats = p.leagues[league];
  stats.bestDecadeScore = Math.max(stats.bestDecadeScore, score);
  save(p);
  return p;
}

// Records a Rapid Fire run, keeping the user's longest streak.
export function recordRapid(league: League, streak: number): Profile {
  const p = loadProfile();
  const stats = p.leagues[league];
  stats.bestRapidStreak = Math.max(stats.bestRapidStreak, streak);
  save(p);
  return p;
}
