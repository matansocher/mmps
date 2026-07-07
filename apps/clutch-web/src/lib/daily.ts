import type { League, Playoffs } from '../types';
import { seasonsFor, seasonsForSelection, leagueOf } from './playoffs';
import type { LeagueSelection } from './leagues';

// Deterministic PRNG (mulberry32) so a given seed always yields the same sequence.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Days since a fixed epoch, in local time — the "puzzle number".
const EPOCH = Date.UTC(2024, 0, 1);

export function dayNumber(date = new Date()): number {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((local.getTime() - EPOCH) / 86400000);
}

export function dateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// A shuffled cycle of all season-years, so we exhaust every year before any repeats.
function shuffledSeasonCycle(league: League): number[] {
  const years = seasonsFor(league).map((s) => s.season);
  const rng = mulberry32(hashString(`playoff-daily-cycle-v1-${league}`));
  for (let i = years.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [years[i], years[j]] = [years[j], years[i]];
  }
  return years;
}

const CYCLES: Partial<Record<League, number[]>> = {};

function cycleFor(league: League): number[] {
  return (CYCLES[league] ??= shuffledSeasonCycle(league));
}

// The season-year for a given day — identical for everyone on the same calendar day.
export function dailySeasonYear(league: League, date = new Date()): number {
  const cycle = cycleFor(league);
  const n = dayNumber(date);
  const idx = ((n % cycle.length) + cycle.length) % cycle.length;
  return cycle[idx];
}

// A shuffled cycle of the selection's seasons, so every season is exhausted before repeats.
function shuffledSeasonPool(sel: LeagueSelection): Playoffs[] {
  const pool = [...seasonsForSelection(sel)];
  const rng = mulberry32(hashString(`playoff-daily-pool-v1-${sel}`));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

const POOL_CYCLES: Partial<Record<LeagueSelection, Playoffs[]>> = {};

function poolFor(sel: LeagueSelection): Playoffs[] {
  return (POOL_CYCLES[sel] ??= shuffledSeasonPool(sel));
}

// The full season for a given day — works for a single league or the "all" mix.
export function dailySeason(sel: LeagueSelection, date = new Date()): Playoffs {
  const pool = poolFor(sel);
  const n = dayNumber(date);
  const idx = ((n % pool.length) + pool.length) % pool.length;
  return pool[idx];
}

// ── Clutch Daily ────────────────────────────────────────────────────────────
// One shared 5-question quiz per calendar day, identical for everyone. Each
// question shows a year + tournament and asks which team lifted the trophy.

export type DailyQuestion = {
  readonly league: League;
  readonly season: number;
  readonly champion: string;
  readonly options: readonly string[]; // 4 choices incl. the champion, deterministically ordered
};

export const DAILY_QUESTION_COUNT = 5;

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// The day's five questions — mixed across all four tournaments, same for the whole world.
export function dailyClutchQuestions(date = new Date()): DailyQuestion[] {
  const rng = mulberry32(hashString(`clutch-daily-v1-${dateKey(date)}`));
  const all = seasonsForSelection('all');

  const championsByLeague = new Map<League, string[]>();
  for (const s of all) {
    const lg = leagueOf(s);
    const list = championsByLeague.get(lg) ?? [];
    if (!list.includes(s.champion)) list.push(s.champion);
    championsByLeague.set(lg, list);
  }

  const picks = seededShuffle([...all], rng).slice(0, DAILY_QUESTION_COUNT);
  return picks.map((s) => {
    const lg = leagueOf(s);
    const decoys = seededShuffle((championsByLeague.get(lg) ?? []).filter((c) => c !== s.champion), rng).slice(0, 3);
    const options = seededShuffle([s.champion, ...decoys], rng);
    return { league: lg, season: s.season, champion: s.champion, options };
  });
}

// Milliseconds until local midnight — powers the "next Clutch" countdown.
export function msUntilNextDay(date = new Date()): number {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return next.getTime() - date.getTime();
}
