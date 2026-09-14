import { describe, expect, it } from 'vitest';
import { applyRating, biteStatus, computeStreak, emptyProgress, isDue, localDateKey, nextIntervalDays } from './scheduler';
import type { BiteState, LearnerProgress } from './types';

describe('nextIntervalDays()', () => {
  it('returns 1 day for nope', () => {
    expect(nextIntervalDays('nope', 5)).toEqual(1);
  });
  it('returns 3 days for fuzzy', () => {
    expect(nextIntervalDays('fuzzy', 5)).toEqual(3);
  });
  it('grows for repeated got_it', () => {
    const first = nextIntervalDays('got_it', 0);
    const second = nextIntervalDays('got_it', 1);
    const third = nextIntervalDays('got_it', 2);
    expect(first).toEqual(7);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });
});

describe('applyRating()', () => {
  const now = new Date('2026-01-10T09:00:00.000Z');

  it('sets dueAt 1 day out for nope', () => {
    const state = applyRating(undefined, 'nope', now);
    expect(state.dueAt).toEqual(new Date('2026-01-11T09:00:00.000Z').toISOString());
    expect(state.reps).toEqual(1);
    expect(state.rating).toEqual('nope');
  });

  it('sets dueAt 7 days out for first got_it', () => {
    const state = applyRating(undefined, 'got_it', now);
    expect(state.dueAt).toEqual(new Date('2026-01-17T09:00:00.000Z').toISOString());
  });

  it('resets the got_it growth counter when a later rating is not got_it', () => {
    let state = applyRating(undefined, 'got_it', now); // reps 1
    state = applyRating(state, 'got_it', now); // reps 2, larger interval
    const beforeFuzzy = state.dueAt;
    state = applyRating(state, 'fuzzy', now);
    expect(state.dueAt).toEqual(new Date('2026-01-13T09:00:00.000Z').toISOString());
    expect(state.dueAt).not.toEqual(beforeFuzzy);
    // next got_it after a lapse should start the growth over (7 days)
    const relearned = applyRating(state, 'got_it', now);
    expect(relearned.dueAt).toEqual(new Date('2026-01-17T09:00:00.000Z').toISOString());
  });
});

describe('isDue() / biteStatus()', () => {
  const now = new Date('2026-01-10T09:00:00.000Z');

  it('treats a past dueAt as due', () => {
    const state: BiteState = { biteId: 'x', rating: 'fuzzy', readAt: null, dueAt: '2026-01-09T09:00:00.000Z', reps: 1, quizPassed: false };
    expect(isDue(state, now)).toEqual(true);
    expect(biteStatus(state, now)).toEqual('due');
  });

  it('classifies a fresh got_it as mastered', () => {
    const state = applyRating(undefined, 'got_it', now);
    expect(biteStatus(state, now)).toEqual('mastered');
  });

  it('classifies an unseen bite as new', () => {
    expect(biteStatus(undefined, now)).toEqual('new');
  });
});

describe('computeStreak()', () => {
  it('increments when last study was yesterday', () => {
    const now = new Date('2026-01-10T09:00:00.000Z');
    const yesterday = localDateKey(new Date('2026-01-09T09:00:00.000Z'));
    const prev: LearnerProgress = { ...emptyProgress(), streak: 4, lastStudyDate: yesterday };
    expect(computeStreak(prev, now)).toEqual(5);
  });

  it('keeps the streak when already studied today', () => {
    const now = new Date('2026-01-10T09:00:00.000Z');
    const prev: LearnerProgress = { ...emptyProgress(), streak: 4, lastStudyDate: localDateKey(now) };
    expect(computeStreak(prev, now)).toEqual(4);
  });

  it('resets to 1 after a gap', () => {
    const now = new Date('2026-01-10T09:00:00.000Z');
    const prev: LearnerProgress = { ...emptyProgress(), streak: 9, lastStudyDate: '2026-01-01' };
    expect(computeStreak(prev, now)).toEqual(1);
  });
});
