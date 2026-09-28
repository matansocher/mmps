import { earnsGameMilestone } from './milestones';

export type RunMode = 'classic' | 'practice' | 'daily';
export type RunRecord = {
  readonly runId: string;
  readonly gameId: string;
  readonly score: number;
  readonly at: string;
  readonly day?: string;
  readonly mode?: RunMode;
  readonly version?: number;
  readonly variant?: string;
  readonly durationMs?: number;
  readonly stats?: readonly { readonly label: string; readonly value: string }[];
};
export type ProgressSource = {
  readonly games: Readonly<Record<string, number>>;
  readonly days: Readonly<Record<string, number>>;
};
export type PlayerProgress = {
  readonly sources: Readonly<Record<string, ProgressSource>>;
  readonly awards: Readonly<Record<string, string>>;
  readonly records: Readonly<Record<string, number>>;
};
export const EMPTY_PROGRESS: PlayerProgress = { sources: {}, awards: {}, records: {} };
export const SCORING_VERSION = 2;
export const DAILY_GOAL = 3;

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function maxima(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): Record<string, number> {
  const result = { ...a };
  for (const [key, value] of Object.entries(b)) result[key] = Math.max(result[key] ?? 0, value);
  return result;
}

export function mergeProgress(a: PlayerProgress = EMPTY_PROGRESS, b: PlayerProgress = EMPTY_PROGRESS): PlayerProgress {
  const sources = { ...a.sources };
  for (const [id, source] of Object.entries(b.sources)) {
    sources[id] = { games: maxima(sources[id]?.games ?? {}, source.games), days: maxima(sources[id]?.days ?? {}, source.days) };
  }
  const awards = { ...a.awards };
  for (const [id, at] of Object.entries(b.awards)) if (!awards[id] || at < awards[id]) awards[id] = at;
  return { sources, awards, records: maxima(a.records, b.records) };
}

export function scoreKey(run: Pick<RunRecord, 'gameId' | 'mode' | 'version' | 'variant'>): string {
  return [run.gameId, run.mode ?? 'classic', run.version ?? 1, run.variant ?? 'standard'].join(':');
}

export function progressCounts(progress: PlayerProgress): ProgressSource {
  const games: Record<string, number> = {};
  const days: Record<string, number> = {};
  for (const source of Object.values(progress.sources)) {
    for (const [id, count] of Object.entries(source.games)) games[id] = (games[id] ?? 0) + count;
    for (const [day, count] of Object.entries(source.days)) days[day] = (days[day] ?? 0) + count;
  }
  return { games, days };
}

export function streakForDays(days: readonly string[], today = localDay()): { readonly current: number; readonly longest: number } {
  const sorted = [...new Set(days)].sort();
  let longest = 0;
  let length = 0;
  let previous = -Infinity;
  for (const day of sorted) {
    const number = Date.parse(`${day}T12:00:00Z`) / 86400000;
    length = number - previous === 1 ? length + 1 : 1;
    previous = number;
    longest = Math.max(longest, length);
  }
  const distance = Date.parse(`${today}T12:00:00Z`) / 86400000 - previous;
  return { current: distance === 0 || distance === 1 ? length : 0, longest };
}

export function awardProgress(progress: PlayerProgress, at: string): PlayerProgress {
  const { games, days } = progressCounts(progress);
  const total = Object.values(games).reduce((sum, count) => sum + count, 0);
  const distinct = Object.keys(games).filter((id) => id !== 'warm-up').length;
  const longest = streakForDays(Object.keys(days)).longest;
  const awards = { ...progress.awards };
  const reached: Record<string, boolean> = {
    'first-steps': total >= 1,
    'getting-warmed-up': total >= 10,
    dedicated: total >= 50,
    centurion: total >= 100,
    explorer: distinct >= 5,
    completionist: distinct >= 14,
    'on-a-roll': longest >= 3,
    unstoppable: longest >= 7,
    'daily-loop': Object.values(days).some((count) => count >= DAILY_GOAL),
  };
  for (const [id, value] of Object.entries(reached)) if (value && !awards[id]) awards[id] = at;
  return { ...progress, awards };
}

export function addProgressRun(progress: PlayerProgress, sourceId: string, run: RunRecord): PlayerProgress {
  const source = progress.sources[sourceId] ?? { games: {}, days: {} };
  const day = run.day ?? localDay(new Date(run.at));
  const key = scoreKey(run);
  const result = {
    ...progress,
    sources: {
      ...progress.sources,
      [sourceId]: {
        games: { ...source.games, [run.gameId]: (source.games[run.gameId] ?? 0) + 1 },
        days: { ...source.days, [day]: (source.days[day] ?? 0) + 1 },
      },
    },
    records: { ...progress.records, [key]: Math.max(progress.records[key] ?? 0, run.score) },
  };
  if (earnsGameMilestone(run)) {
    result.awards = {
      ...result.awards,
      [`mastery-${run.gameId}`]: result.awards[`mastery-${run.gameId}`] ?? run.at,
      ...(run.gameId === 'rail-router' ? { [`rail-${run.variant}`]: result.awards[`rail-${run.variant}`] ?? run.at } : {}),
    };
  }
  return awardProgress(result, run.at);
}

export function progressFromHistory(history: readonly RunRecord[], bestScores: Readonly<Record<string, number>> = {}): PlayerProgress {
  let result = EMPTY_PROGRESS;
  const seen = new Set<string>();
  for (const run of [...history].reverse()) {
    if (seen.has(run.runId)) continue;
    seen.add(run.runId);
    result = addProgressRun(result, 'legacy', run);
  }
  const top = Math.max(0, ...Object.values(bestScores));
  const at = history[0]?.at ?? new Date().toISOString();
  if (top >= 500) result = { ...result, awards: { ...result.awards, 'high-scorer': result.awards['high-scorer'] ?? at, ...(top >= 1000 ? { elite: result.awards.elite ?? at } : {}) } };
  return result;
}

export function mergeRunHistory(a: readonly RunRecord[], b: readonly RunRecord[], limit = 200): RunRecord[] {
  const byId = new Map<string, RunRecord>();
  for (const entry of [...b, ...a]) byId.set(entry.runId, entry);
  return [...byId.values()].sort((x, y) => y.at.localeCompare(x.at)).slice(0, limit);
}

export function seededRandom(seed: string): () => number {
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => {
    value += 0x6d2b79f5;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
