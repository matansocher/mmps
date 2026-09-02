const HISTORY_KEY = 'mindloop:history';
const MAX_ENTRIES = 200;

export interface PlayEntry {
  gameId: string;
  score: number;
  /** ISO timestamp of when the run finished. */
  at: string;
}

function read(): PlayEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: PlayEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** Records a finished run. Newest entries are stored first. */
export function recordPlay(gameId: string, score: number): void {
  const entries = read();
  entries.unshift({ gameId, score, at: new Date().toISOString() });
  write(entries);
  window.dispatchEvent(new Event('mindloop:data'));
}

export function getHistory(): PlayEntry[] {
  return read();
}

export function getPlayCount(gameId: string): number {
  return read().filter((e) => e.gameId === gameId).length;
}

export function getTotalPlays(): number {
  return read().length;
}

/** Returns the most recently played game ids, de-duplicated, newest first. */
export function getRecentGameIds(limit = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of read()) {
    if (seen.has(e.gameId)) continue;
    seen.add(e.gameId);
    out.push(e.gameId);
    if (out.length >= limit) break;
  }
  return out;
}

/** Returns the ISO timestamp of the last time a game was played, or null. */
export function getLastPlayed(gameId: string): string | null {
  const entry = read().find((e) => e.gameId === gameId);
  return entry ? entry.at : null;
}

/** Count of distinct games that have been played at least once. */
export function getGamesPlayedCount(): number {
  return new Set(read().map((e) => e.gameId)).size;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('mindloop:data'));
}

/** Local YYYY-MM-DD for a given date. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Set of local day keys on which at least one game was played. */
export function getPlayedDays(): Set<string> {
  return new Set(read().map((e) => dayKey(new Date(e.at))));
}

/** Local YYYY-MM-DD for today. */
export function todayKey(): string {
  return dayKey(new Date());
}

/** Number of runs finished today. */
export function getTodayPlayCount(): number {
  const key = todayKey();
  return read().filter((e) => dayKey(new Date(e.at)) === key).length;
}

/** Distinct games played today. */
export function getTodayGamesPlayed(): number {
  const key = todayKey();
  return new Set(read().filter((e) => dayKey(new Date(e.at)) === key).map((e) => e.gameId)).size;
}

/** Whether at least one game was played today. */
export function playedToday(): boolean {
  return getPlayedDays().has(todayKey());
}

/**
 * Consecutive-day streak ending today (or yesterday if not played today yet).
 * Returns 0 if the most recent play was before yesterday.
 */
export function getStreak(): number {
  const days = getPlayedDays();
  if (days.size === 0) return 0;

  const today = new Date();
  const todayKey = dayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dayKey(yesterday);

  // Anchor the streak at today if played today, else yesterday.
  let cursor = new Date(today);
  if (!days.has(todayKey)) {
    if (days.has(yesterdayKey)) {
      cursor = yesterday;
    } else {
      return 0;
    }
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
