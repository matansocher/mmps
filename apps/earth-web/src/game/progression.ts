import type { GameMode } from './modes';

export type FlightKind = GameMode['kind'];

export type Progress = {
  readonly miles: number;
  readonly rounds: number;
  readonly stamps: Readonly<Record<string, number>>; // country code -> times found
  readonly achievements: readonly string[];
  readonly streak: number; // consecutive days with a daily flight, as of `lastDaily`
  readonly lastDaily: string | null; // Format: "YYYY-MM-DD" (local)
  readonly daily: Readonly<Record<string, number>>; // day -> daily flight score
};

export type RoundResult = {
  readonly kind: FlightKind;
  readonly score: number;
  readonly outOf: number;
  readonly found: readonly string[]; // codes the player found this round
};

export type Tier = {
  readonly name: string;
  readonly miles: number; // miles needed to reach it
};

export type Achievement = {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
};

export type RoundOutcome = {
  readonly progress: Progress;
  readonly earned: number;
  readonly newStamps: readonly string[];
  readonly unlocked: readonly Achievement[];
  readonly tierUp: Tier | null;
};

export const EMPTY_PROGRESS: Progress = { miles: 0, rounds: 0, stamps: {}, achievements: [], streak: 0, lastDaily: null, daily: {} };

export const TIERS: readonly Tier[] = [
  { name: 'Economy', miles: 0 },
  { name: 'Premium', miles: 1_500 },
  { name: 'Business', miles: 5_000 },
  { name: 'First', miles: 12_000 },
  { name: 'Captain', miles: 25_000 },
];

export const MILES_PER_POINT: Readonly<Record<FlightKind, number>> = { classic: 100, continent: 100, daily: 150 };
export const PERFECT_BONUS = 500;
export const NEW_STAMP_BONUS = 50;
const DAILY_HISTORY = 60;

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: 'first-flight', title: 'First flight', detail: 'Finish any round' },
  { id: 'perfect-landing', title: 'Perfect landing', detail: 'Get every question right in a round' },
  { id: 'commuter', title: 'Commuter', detail: 'Fly the daily flight 3 days in a row' },
  { id: 'frequent-flyer', title: 'Frequent flyer', detail: 'Fly the daily flight 7 days in a row' },
  { id: 'well-travelled', title: 'Well travelled', detail: 'Collect 25 passport stamps' },
  { id: 'globetrotter', title: 'Globetrotter', detail: 'Collect 100 passport stamps' },
  { id: 'six-continents', title: 'Six continents', detail: 'Collect a stamp from every continent' },
  { id: 'business-class', title: 'Business class', detail: 'Reach Business tier' },
];

const CONTINENT_COUNT = 6;

export function tierFor(miles: number): { readonly tier: Tier; readonly next: Tier | null; readonly progress: number } {
  const index = TIERS.findLastIndex((tier) => miles >= tier.miles);
  const tier = TIERS[Math.max(index, 0)];
  const next = TIERS[index + 1] ?? null;
  const progress = next ? (miles - tier.miles) / (next.miles - tier.miles) : 1;
  return { tier, next, progress };
}

export function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d - 1));
}

// The streak still counts today if the last daily flight was today or yesterday.
export function currentStreak(progress: Progress, today: string): number {
  return progress.lastDaily === today || progress.lastDaily === previousDay(today) ? progress.streak : 0;
}

// Deterministic per-day random, so everyone gets the same daily flight.
export function dailyRandom(day: string): () => number {
  let seed = 2166136261;
  for (const char of day) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Day number shown as the daily flight's number, counted from launch.
export function flightNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86_400_000) + 1;
}

export function milesFor(round: RoundResult): number {
  const perfect = round.outOf > 0 && round.score === round.outOf;
  return round.score * MILES_PER_POINT[round.kind] + (perfect ? PERFECT_BONUS : 0);
}

function trimDaily(daily: Record<string, number>): Record<string, number> {
  const days = Object.keys(daily).sort().slice(-DAILY_HISTORY);
  return Object.fromEntries(days.map((day) => [day, daily[day]]));
}

function earnedAchievements(progress: Progress, round: RoundResult, continentOf: (code: string) => string | undefined): string[] {
  const stampCount = Object.keys(progress.stamps).length;
  const continents = new Set(Object.keys(progress.stamps).map(continentOf).filter(Boolean));
  const perfect = round.outOf > 0 && round.score === round.outOf;
  const checks: Record<string, boolean> = {
    'first-flight': true,
    'perfect-landing': perfect,
    commuter: progress.streak >= 3,
    'frequent-flyer': progress.streak >= 7,
    'well-travelled': stampCount >= 25,
    globetrotter: stampCount >= 100,
    'six-continents': continents.size >= CONTINENT_COUNT,
    'business-class': progress.miles >= TIERS[2].miles,
  };
  return ACHIEVEMENTS.filter(({ id }) => checks[id] && !progress.achievements.includes(id)).map(({ id }) => id);
}

export function applyRound(progress: Progress, round: RoundResult, today: string, continentOf: (code: string) => string | undefined): RoundOutcome {
  const stamps = { ...progress.stamps };
  const newStamps: string[] = [];
  for (const code of new Set(round.found)) {
    if (!stamps[code]) newStamps.push(code);
    stamps[code] = (stamps[code] ?? 0) + 1;
  }

  let { streak, lastDaily, daily } = progress;
  if (round.kind === 'daily' && daily[today] === undefined) {
    streak = lastDaily === previousDay(today) ? streak + 1 : lastDaily === today ? streak : 1;
    lastDaily = today;
    daily = trimDaily({ ...daily, [today]: round.score });
  }

  const earned = milesFor(round) + newStamps.length * NEW_STAMP_BONUS;
  const next: Progress = { ...progress, miles: progress.miles + earned, rounds: progress.rounds + 1, stamps, streak, lastDaily, daily };
  const unlockedIds = earnedAchievements(next, round, continentOf);
  const before = tierFor(progress.miles).tier;
  const after = tierFor(next.miles).tier;
  return {
    progress: { ...next, achievements: [...next.achievements, ...unlockedIds] },
    earned,
    newStamps,
    unlocked: ACHIEVEMENTS.filter(({ id }) => unlockedIds.includes(id)),
    tierUp: after.miles > before.miles ? after : null,
  };
}

const isCountMap = (value: unknown): value is Record<string, number> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every((v) => typeof v === 'number' && Number.isFinite(v));

export function isProgress(value: unknown): value is Progress {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.miles === 'number' &&
    typeof p.rounds === 'number' &&
    typeof p.streak === 'number' &&
    (p.lastDaily === null || typeof p.lastDaily === 'string') &&
    Array.isArray(p.achievements) &&
    p.achievements.every((a) => typeof a === 'string') &&
    isCountMap(p.stamps) &&
    isCountMap(p.daily)
  );
}
