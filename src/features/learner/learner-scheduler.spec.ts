import { describe, expect, it } from 'vitest';
import { LEARNER_CURRICULUM } from './learner-catalog';
import { applyRating, biteStatus, emptyState, isDue, nextIntervalDays, selectNextBite } from './learner-scheduler';
import type { LearnerBiteState, LearnerProgress } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

const progressWith = (states: Record<string, LearnerBiteState>): Pick<LearnerProgress, 'states'> => ({ states });

describe('nextIntervalDays()', () => {
  it('returns 1 day for nope', () => {
    expect(nextIntervalDays('nope', 0)).toBe(1);
  });
  it('returns 3 days for fuzzy', () => {
    expect(nextIntervalDays('fuzzy', 5)).toBe(3);
  });
  it('grows got_it interval with the streak', () => {
    expect(nextIntervalDays('got_it', 0)).toBe(7);
    expect(nextIntervalDays('got_it', 1)).toBe(15);
    expect(nextIntervalDays('got_it', 2)).toBe(34);
  });
});

describe('applyRating()', () => {
  const now = new Date('2026-01-01T09:00:00.000Z');

  it('increments reps and resets the got_it streak on a lapse', () => {
    const first = applyRating(emptyState('b'), 'got_it', now);
    const lapsed = applyRating(first, 'nope', now);
    expect(lapsed.reps).toBe(2);
    expect(lapsed.gotItStreak).toBe(0);
    expect(new Date(lapsed.dueAt!).getTime()).toBe(now.getTime() + 1 * DAY_MS);
  });

  it('extends the interval as got_it repeats', () => {
    let state = applyRating(emptyState('b'), 'got_it', now);
    expect(state.gotItStreak).toBe(1);
    state = applyRating(state, 'got_it', now);
    expect(state.gotItStreak).toBe(2);
    expect(new Date(state.dueAt!).getTime()).toBe(now.getTime() + 15 * DAY_MS);
  });
});

describe('isDue() / biteStatus()', () => {
  const now = new Date('2026-01-10T00:00:00.000Z');
  it('treats a never-seen bite as new', () => {
    expect(biteStatus(undefined, now)).toBe('new');
  });
  it('flags a past-due bite as due', () => {
    const past = { ...emptyState('b'), rating: 'fuzzy' as const, dueAt: new Date(now.getTime() - DAY_MS).toISOString() };
    expect(isDue(past, now)).toBe(true);
    expect(biteStatus(past, now)).toBe('due');
  });
  it('marks a not-yet-due got_it bite as mastered', () => {
    const future = { ...emptyState('b'), rating: 'got_it' as const, dueAt: new Date(now.getTime() + DAY_MS).toISOString() };
    expect(biteStatus(future, now)).toBe('mastered');
  });
});

describe('selectNextBite()', () => {
  const now = new Date('2026-01-10T00:00:00.000Z');

  it('returns the first curriculum bite for a brand-new user', () => {
    expect(selectNextBite(progressWith({}), now)).toBe(LEARNER_CURRICULUM[0]);
  });

  it('prioritises a due bite over new ones', () => {
    const dueId = LEARNER_CURRICULUM[2];
    const states: Record<string, LearnerBiteState> = {
      [LEARNER_CURRICULUM[0]]: { ...emptyState(LEARNER_CURRICULUM[0]), rating: 'got_it', dueAt: new Date(now.getTime() + 30 * DAY_MS).toISOString() },
      [dueId]: { ...emptyState(dueId), rating: 'fuzzy', dueAt: new Date(now.getTime() - DAY_MS).toISOString() },
    };
    expect(selectNextBite(progressWith(states), now)).toBe(dueId);
  });

  it('returns null when everything is mastered and nothing is due', () => {
    const states: Record<string, LearnerBiteState> = {};
    for (const id of LEARNER_CURRICULUM) {
      states[id] = { ...emptyState(id), rating: 'got_it', dueAt: new Date(now.getTime() + 30 * DAY_MS).toISOString() };
    }
    expect(selectNextBite(progressWith(states), now)).toBeNull();
  });
});
