import { describe, expect, it } from 'vitest';
import { addProgressRun, EMPTY_PROGRESS, mergeProgress, mergeRunHistory, progressCounts, scoreKey, seededRandom, streakForDays } from './progress';
import type { RunRecord } from './progress';

const run = (id: number, day = '2026-09-20'): RunRecord => ({ runId: String(id), gameId: 'grid-recall', at: `${day}T12:00:00Z`, day, score: id, mode: 'classic', version: 2 });
describe('Mindloop durable progress', () => {
  it('counts repeat rounds toward the daily goal and survives capped history', () => {
    let progress = EMPTY_PROGRESS;
    let history: RunRecord[] = [];
    for (let i = 0; i < 260; i++) {
      const entry = run(i);
      progress = addProgressRun(progress, 'phone', entry);
      history = mergeRunHistory([entry], history);
    }
    expect(history).toHaveLength(200);
    expect(progressCounts(progress).games['grid-recall']).toBe(260);
    expect(progressCounts(progress).days['2026-09-20']).toBe(260);
    expect(progress.awards['daily-loop']).toBeTruthy();
  });
  it('merges independent devices without double counting repeated snapshots', () => {
    const phone = addProgressRun(EMPTY_PROGRESS, 'phone', run(1));
    const tablet = addProgressRun(phone, 'tablet', run(2));
    const merged = mergeProgress(phone, tablet);
    expect(progressCounts(merged).games['grid-recall']).toBe(2);
    expect(mergeProgress(merged, tablet)).toEqual(merged);
    expect(mergeProgress(tablet, phone)).toEqual(merged);
  });
  it('keeps a seven-day award and longest streak after a long break', () => {
    let progress = EMPTY_PROGRESS;
    for (let i = 20; i < 27; i++) progress = addProgressRun(progress, 'phone', run(i, `2026-09-${i}`));
    expect(streakForDays(Object.keys(progressCounts(progress).days), '2026-10-10')).toEqual({ current: 0, longest: 7 });
    expect(progress.awards.unstoppable).toBeTruthy();
  });
  it('separates practice, scoring versions, and board records', () => {
    const base = run(1);
    expect(new Set([scoreKey(base), scoreKey({ ...base, mode: 'practice' }), scoreKey({ ...base, version: 1 }), scoreKey({ ...base, variant: 'corridor-1' })]).size).toBe(4);
  });
  it('uses reproducible seeded content', () => {
    const a = seededRandom('day-one'),
      b = seededRandom('day-one'),
      c = seededRandom('day-two');
    const sequence = Array.from({ length: 8 }, a);
    expect(Array.from({ length: 8 }, b)).toEqual(sequence);
    expect(Array.from({ length: 8 }, c)).not.toEqual(sequence);
  });
});
