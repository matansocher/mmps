import { describe, expect, it } from 'vitest';
import { parseLessonsParam, practiceErrorMessage, scopeLabel, scoreColorVar, verdictLabel, verdictTone } from './practice';

describe('verdictLabel() / verdictTone()', () => {
  it.each([
    { verdict: 'correct' as const, skipped: false, label: 'Correct', tone: 'good' },
    { verdict: 'partial' as const, skipped: false, label: 'Partially correct', tone: 'mid' },
    { verdict: 'incorrect' as const, skipped: false, label: 'Not quite', tone: 'bad' },
    { verdict: 'incorrect' as const, skipped: true, label: 'Skipped', tone: 'muted' },
  ])('maps $verdict (skipped=$skipped) to $label', ({ verdict, skipped, label, tone }) => {
    expect(verdictLabel({ verdict, skipped })).toEqual(label);
    expect(verdictTone({ verdict, skipped })).toEqual(tone);
  });
});

describe('scopeLabel()', () => {
  const guides = { 'system-design': 'System Design', 'ai-engineering': 'AI Engineering' };

  it.each([
    { scope: { kind: 'all' as const }, expected: 'All lessons' },
    { scope: { kind: 'all' as const, readOnly: true }, expected: 'Lessons you have read' },
    { scope: { kind: 'guides' as const, guides: ['system-design' as const] }, expected: 'System Design' },
    { scope: { kind: 'guides' as const, guides: ['system-design' as const, 'ai-engineering' as const], readOnly: true }, expected: 'System Design + AI Engineering · read only' },
    { scope: { kind: 'lessons' as const, biteIds: ['a', 'b', 'c'] }, expected: '3 lessons' },
  ])('returns $expected', ({ scope, expected }) => {
    expect(scopeLabel(scope, guides)).toEqual(expected);
  });

  it('uses the lesson title for a single lesson', () => {
    expect(scopeLabel({ kind: 'lessons', biteIds: ['a'] }, guides, new Map([['a', 'Caching']]))).toEqual('Caching');
  });
});

describe('parseLessonsParam()', () => {
  const known = new Set(['a', 'b', 'c']);

  it('keeps known ids, trims and dedupes', () => {
    expect(parseLessonsParam(' a,b,a,zzz ,c', known)).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty list for a missing param', () => {
    expect(parseLessonsParam(null, known)).toEqual([]);
  });
});

describe('practiceErrorMessage()', () => {
  it('maps known codes', () => {
    expect(practiceErrorMessage('too_many_requests')).toContain('breather');
    expect(practiceErrorMessage('request_failed_429')).toContain('breather');
  });

  it('falls back to a generic message', () => {
    expect(practiceErrorMessage('weird')).toEqual('Something went wrong. Please try again.');
    expect(practiceErrorMessage(undefined)).toEqual('Something went wrong. Please try again.');
  });
});

describe('scoreColorVar()', () => {
  it.each([
    { score: 95, expected: 'var(--accent-2)' },
    { score: 60, expected: 'var(--accent-4)' },
    { score: 10, expected: 'var(--danger)' },
  ])('returns $expected for $score', ({ score, expected }) => {
    expect(scoreColorVar(score)).toEqual(expected);
  });
});
