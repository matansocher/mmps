import { LEARNER_CURRICULUM } from './learner-catalog';
import type { LearnerBiteState, LearnerProgress, LearnerRating } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// SM-2-lite intervals (days). Mirrors apps/learner-web/src/lib/scheduler.ts.
export function nextIntervalDays(rating: LearnerRating, gotItStreak: number): number {
  if (rating === 'nope') return 1;
  if (rating === 'fuzzy') return 3;
  return Math.round(7 * Math.pow(2.2, Math.max(0, gotItStreak)));
}

export function emptyState(biteId: string): LearnerBiteState {
  return { biteId, rating: null, readAt: null, dueAt: null, reps: 0, gotItStreak: 0, quizPassed: false };
}

export function applyRating(prev: LearnerBiteState | undefined, rating: LearnerRating, now: Date = new Date()): LearnerBiteState {
  const base = prev ?? emptyState('');
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

export function isDue(state: LearnerBiteState | undefined, now: Date = new Date()): boolean {
  if (!state || !state.dueAt) return false;
  return new Date(state.dueAt).getTime() <= now.getTime();
}

export type BiteStatus = 'new' | 'learning' | 'mastered' | 'due';

export function biteStatus(state: LearnerBiteState | undefined, now: Date = new Date()): BiteStatus {
  if (!state || state.rating === null) return 'new';
  if (isDue(state, now)) return 'due';
  if (state.rating === 'got_it') return 'mastered';
  return 'learning';
}

// Asia/Jerusalem calendar date as YYYY-MM-DD.
export function localDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function computeStreak(prev: Pick<LearnerProgress, 'streak' | 'lastStudyDate'>, now: Date = new Date()): number {
  const today = localDateKey(now);
  if (prev.lastStudyDate === today) return prev.streak;
  const yesterday = localDateKey(new Date(now.getTime() - DAY_MS));
  if (prev.lastStudyDate === yesterday) return prev.streak + 1;
  return 1;
}

// The single next bite to surface in a reminder: due first, then brand-new, then still-learning,
// in curriculum order. Returns null when everything is mastered / nothing is due.
export function selectNextBite(progress: Pick<LearnerProgress, 'states'>, now: Date = new Date()): string | null {
  let firstNew: string | null = null;
  let firstLearning: string | null = null;

  for (const id of LEARNER_CURRICULUM) {
    const status = biteStatus(progress.states[id], now);
    if (status === 'due') return id;
    if (status === 'new' && firstNew === null) firstNew = id;
    else if (status === 'learning' && firstLearning === null) firstLearning = id;
  }

  return firstNew ?? firstLearning;
}

export function emptyProgress(): LearnerProgress {
  return { states: {}, streak: 0, lastStudyDate: null, updatedAt: null };
}
