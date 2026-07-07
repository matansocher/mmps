import { dateKey } from './daily';

export type DailyRecord = {
  readonly year: number;
  readonly score: number;
  readonly maxScore: number;
  readonly correctCount: number;
  readonly total: number;
  readonly flags: readonly boolean[]; // per-series correctness, in play order
};

export type Profile = {
  dailyStreak: number;
  bestDailyStreak: number;
  lastPlayedDate: string | null;
  bestBracketScore: number;
  bestDecadeScore: number;
  bestRapidStreak: number;
  dailyResults: Record<string, DailyRecord>;
};

const KEY = 'nba.profile.v1';

const EMPTY: Profile = {
  dailyStreak: 0,
  bestDailyStreak: 0,
  lastPlayedDate: null,
  bestBracketScore: 0,
  bestDecadeScore: 0,
  bestRapidStreak: 0,
  dailyResults: {},
};

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return { ...EMPTY };
  }
}

function save(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore quota / private-mode errors */
  }
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / 86400000);
}

export function todaysRecord(p: Profile, date = new Date()): DailyRecord | undefined {
  return p.dailyResults[dateKey(date)];
}

// Records today's daily result and updates streak + bests. Idempotent for the same day.
export function recordDaily(record: DailyRecord, date = new Date()): Profile {
  const p = loadProfile();
  const key = dateKey(date);
  const alreadyPlayed = Boolean(p.dailyResults[key]);

  p.dailyResults[key] = record;
  p.bestBracketScore = Math.max(p.bestBracketScore, record.score);

  if (!alreadyPlayed) {
    if (p.lastPlayedDate && daysBetween(p.lastPlayedDate, key) === 1) {
      p.dailyStreak += 1;
    } else if (p.lastPlayedDate === key) {
      // same day — leave streak
    } else {
      p.dailyStreak = 1;
    }
    p.lastPlayedDate = key;
    p.bestDailyStreak = Math.max(p.bestDailyStreak, p.dailyStreak);
  }

  save(p);
  return p;
}

// Records a Decade Champions round, keeping the user's best correct-match count.
export function recordDecade(score: number): Profile {
  const p = loadProfile();
  p.bestDecadeScore = Math.max(p.bestDecadeScore, score);
  save(p);
  return p;
}

// Records a Rapid Fire run, keeping the user's longest streak.
export function recordRapid(streak: number): Profile {
  const p = loadProfile();
  p.bestRapidStreak = Math.max(p.bestRapidStreak, streak);
  save(p);
  return p;
}
