import type { BiteState, LearnerProgress, Rating } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// SM-2-lite spaced-repetition intervals (in days) by rating and repetition count.
// 'nope' -> tomorrow, 'fuzzy' -> 3 days, 'got_it' -> 7 days then it grows.
export function nextIntervalDays(rating: Rating, reps: number): number {
  if (rating === 'nope') return 1;
  if (rating === 'fuzzy') return 3;
  // got_it: 7, then ~16, then ~35... (roughly doubling with a growth factor)
  const gotItReps = Math.max(0, reps);
  return Math.round(7 * Math.pow(2.2, gotItReps));
}

export function emptyState(biteId: string): BiteState {
  return { biteId, rating: null, readAt: null, dueAt: null, reps: 0, gotItStreak: 0, quizPassed: false };
}

// Apply a rating to a bite, computing the next due date. `now` is injectable for tests.
export function applyRating(prev: BiteState | undefined, rating: Rating, now: Date = new Date()): BiteState {
  const base = prev ?? emptyState('');
  // Interval growth is driven by the consecutive got_it streak, which resets on any lapse.
  const gotItStreak = rating === 'got_it' ? (base.gotItStreak ?? 0) : 0;
  const intervalDays = nextIntervalDays(rating, gotItStreak);
  return {
    ...base,
    rating,
    readAt: now.toISOString(),
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
    reps: base.reps + 1,
    gotItStreak: rating === 'got_it' ? gotItStreak + 1 : 0,
  };
}

export function isDue(state: BiteState | undefined, now: Date = new Date()): boolean {
  if (!state || !state.dueAt) return false;
  return new Date(state.dueAt).getTime() <= now.getTime();
}

export type BiteStatus = 'new' | 'learning' | 'mastered' | 'due';

export function biteStatus(state: BiteState | undefined, now: Date = new Date()): BiteStatus {
  if (!state || state.rating === null) return 'new';
  if (isDue(state, now)) return 'due';
  if (state.rating === 'got_it') return 'mastered';
  return 'learning';
}

export function emptyProgress(): LearnerProgress {
  return { states: {}, streak: 0, lastStudyDate: null, updatedAt: null };
}

// Local (Asia/Jerusalem) calendar date as YYYY-MM-DD.
export function localDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

// Update streak based on today's study date. Returns the new streak value.
export function computeStreak(prev: LearnerProgress, now: Date = new Date()): number {
  const today = localDateKey(now);
  if (prev.lastStudyDate === today) return prev.streak; // already counted today
  const yesterday = localDateKey(new Date(now.getTime() - DAY_MS));
  if (prev.lastStudyDate === yesterday) return prev.streak + 1;
  return 1; // streak reset / first study
}

export type ProgressSummary = {
  readonly total: number;
  readonly mastered: number;
  readonly learning: number;
  readonly due: number;
  readonly notStarted: number;
};

export function summarize(progress: LearnerProgress, curriculum: ReadonlyArray<string>, now: Date = new Date()): ProgressSummary {
  let mastered = 0;
  let learning = 0;
  let due = 0;
  let notStarted = 0;
  for (const id of curriculum) {
    const status = biteStatus(progress.states[id], now);
    if (status === 'mastered') mastered++;
    else if (status === 'due') due++;
    else if (status === 'learning') learning++;
    else notStarted++;
  }
  return { total: curriculum.length, mastered, learning, due, notStarted };
}
