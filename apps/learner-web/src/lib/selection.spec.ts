import { describe, expect, it } from 'vitest';
import { emptyProgress, emptyState } from './scheduler';
import { selectMemorySparkBite, selectMemorySparkQuestionIndex } from './selection';

describe('selectMemorySparkBite()', () => {
  const now = new Date('2026-09-19T12:00:00.000Z');

  it('returns no bite when nothing has been read', () => {
    expect(selectMemorySparkBite(emptyProgress(), now)).toBeUndefined();
  });

  it('prefers eligible due content over other previously read content', () => {
    const progress = emptyProgress();
    progress.states['system-design:delivery'] = {
      ...emptyState('system-design:delivery'),
      readAt: '2026-09-10T12:00:00.000Z',
      dueAt: '2026-09-18T12:00:00.000Z',
    };
    progress.states['ai-engineering:foundations'] = {
      ...emptyState('ai-engineering:foundations'),
      readAt: '2026-09-18T12:00:00.000Z',
      dueAt: '2026-09-30T12:00:00.000Z',
    };

    expect(selectMemorySparkBite(progress, now)).toEqual('system-design:delivery');
  });

  it('ignores read bites without quiz data', () => {
    const progress = emptyProgress();
    progress.states['system-design:cheatsheet'] = {
      ...emptyState('system-design:cheatsheet'),
      readAt: '2026-09-10T12:00:00.000Z',
    };

    expect(selectMemorySparkBite(progress, now)).toBeUndefined();
  });
});

describe('selectMemorySparkQuestionIndex()', () => {
  it('is stable for the same bite and day', () => {
    const now = new Date('2026-09-19T12:00:00.000Z');
    expect(selectMemorySparkQuestionIndex('system-design:caching', 3, now)).toEqual(selectMemorySparkQuestionIndex('system-design:caching', 3, now));
  });

  it('returns -1 when there are no questions', () => {
    expect(selectMemorySparkQuestionIndex('missing', 0)).toEqual(-1);
  });
});
