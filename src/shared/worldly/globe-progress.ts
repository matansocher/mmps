// Mirrors the Earth mini-app's Progress (apps/earth-web/src/game/progression.ts).
export type GlobeProgress = {
  readonly miles: number;
  readonly rounds: number;
  readonly stamps: Readonly<Record<string, number>>;
  readonly achievements: readonly string[];
  readonly streak: number;
  readonly lastDaily: string | null; // YYYY-MM-DD
  readonly daily: Readonly<Record<string, number>>;
};

// Best score per mode key, e.g. "best:continent:Europe" or "best:daily:2026-01-31".
export type GlobeBestScores = Readonly<Record<string, number>>;

export type GlobeProgressSnapshot = {
  readonly progress: GlobeProgress;
  readonly bestScores: GlobeBestScores;
};

export type GlobeProgressDocument = GlobeProgressSnapshot & {
  readonly _id: number; // Telegram user id
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export const GLOBE_DAILY_HISTORY = 60;

export const EMPTY_GLOBE_PROGRESS: GlobeProgress = { miles: 0, rounds: 0, stamps: {}, achievements: [], streak: 0, lastDaily: null, daily: {} };

function maxPerKey(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = { ...a };
  for (const [key, value] of Object.entries(b)) out[key] = Math.max(out[key] ?? 0, value);
  return out;
}

function trimDaily(daily: Readonly<Record<string, number>>): Record<string, number> {
  const keys = Object.keys(daily).sort().slice(-GLOBE_DAILY_HISTORY);
  return Object.fromEntries(keys.map((key) => [key, daily[key]]));
}

function trimDailyBest(best: GlobeBestScores): GlobeBestScores {
  const dailyKeys = Object.keys(best)
    .filter((key) => key.startsWith('best:daily:'))
    .sort();
  const drop = new Set(dailyKeys.slice(0, Math.max(0, dailyKeys.length - GLOBE_DAILY_HISTORY)));
  return Object.fromEntries(Object.entries(best).filter(([key]) => !drop.has(key)));
}

// Monotonic merge: progress only grows, so syncing the same snapshot twice is a no-op.
export function mergeGlobeProgress(a: GlobeProgress, b: GlobeProgress): GlobeProgress {
  const aDay = a.lastDaily ?? '';
  const bDay = b.lastDaily ?? '';
  const streakSource = aDay === bDay ? (a.streak >= b.streak ? a : b) : aDay > bDay ? a : b;
  return {
    miles: Math.max(a.miles, b.miles),
    rounds: Math.max(a.rounds, b.rounds),
    stamps: maxPerKey(a.stamps, b.stamps),
    achievements: [...new Set([...a.achievements, ...b.achievements])],
    streak: streakSource.streak,
    lastDaily: streakSource.lastDaily,
    daily: trimDaily(maxPerKey(a.daily, b.daily)),
  };
}

export function mergeGlobeSnapshots(a: GlobeProgressSnapshot, b: GlobeProgressSnapshot): GlobeProgressSnapshot {
  return {
    progress: mergeGlobeProgress(a.progress, b.progress),
    bestScores: trimDailyBest(maxPerKey(a.bestScores, b.bestScores)),
  };
}
