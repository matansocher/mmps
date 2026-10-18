import type { LearnerQuestion, PracticeDifficulty, PracticeQuestionStats } from '../types';
import { finalizeGrade, intervalDaysForScore, isNonAnswer, nextQuestionStats, skippedGrade, verdictForScore } from './practice-grading';
import { filterQuestionsByScope, selectQuestion, unlockedQuestions } from './practice-selection';

const q = (id: string, biteId: string, guide: LearnerQuestion['guide'] = 'system-design', difficulty: PracticeDifficulty = 'easy'): LearnerQuestion => ({
  id,
  biteId,
  guide,
  lessonTitle: biteId,
  question: `${id}?`,
  referenceAnswer: `${id}!`,
  difficulty,
});

const NOW = new Date('2025-01-10T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

const stat = (questionId: string, lastScore: number, dueOffsetDays: number): PracticeQuestionStats => ({
  _id: `1:${questionId}`,
  telegramUserId: 1,
  questionId,
  biteId: 'b',
  attempts: 1,
  lastScore,
  bestScore: lastScore,
  streak: 0,
  lastAttemptAt: NOW,
  dueAt: new Date(NOW.getTime() + dueOffsetDays * DAY),
});

describe('verdictForScore()', () => {
  test.each([
    { score: 100, expected: 'correct' },
    { score: 80, expected: 'correct' },
    { score: 79, expected: 'partial' },
    { score: 50, expected: 'partial' },
    { score: 49, expected: 'incorrect' },
    { score: 0, expected: 'incorrect' },
  ])('$score -> $expected', ({ score, expected }) => {
    expect(verdictForScore(score)).toEqual(expected);
  });
});

describe('isNonAnswer()', () => {
  test.each([
    { answer: '', expected: true },
    { answer: '  I don’t know.  ', expected: true },
    { answer: 'IDK', expected: true },
    { answer: 'לא יודע', expected: true },
    { answer: 'Because of CAP', expected: false },
  ])('"$answer" -> $expected', ({ answer, expected }) => {
    expect(isNonAnswer(answer)).toEqual(expected);
  });
});

describe('intervalDaysForScore()', () => {
  test.each([
    { score: 30, streak: 0, expected: 1 },
    { score: 60, streak: 0, expected: 3 },
    { score: 90, streak: 1, expected: 7 },
    { score: 90, streak: 2, expected: 14 },
    { score: 90, streak: 5, expected: 60 },
  ])('score $score streak $streak -> $expected days', ({ score, streak, expected }) => {
    expect(intervalDaysForScore(score, streak)).toEqual(expected);
  });
});

describe('nextQuestionStats()', () => {
  const key = { _id: '1:q', telegramUserId: 1, questionId: 'q', biteId: 'b' };

  test('first correct answer', () => {
    expect(nextQuestionStats(null, key, 85, NOW)).toEqual({
      ...key,
      attempts: 1,
      lastScore: 85,
      bestScore: 85,
      streak: 1,
      lastAttemptAt: NOW,
      dueAt: new Date(NOW.getTime() + 7 * DAY),
    });
  });

  test('a miss resets the streak but keeps the best score', () => {
    const prev = { ...stat('q', 90, 0), streak: 2, bestScore: 95 };
    const next = nextQuestionStats(prev, key, 20, NOW);
    expect([next.attempts, next.streak, next.bestScore, next.dueAt]).toEqual([2, 0, 95, new Date(NOW.getTime() + DAY)]);
  });
});

describe('finalizeGrade()', () => {
  test('clamps the score, derives the verdict and cleans points', () => {
    const grade = finalizeGrade({ score: 104.4, coveredPoints: [' a ', ''], missedPoints: ['1', '2', '3', '4', '5', '6', '7'], incorrectClaims: [], explanation: ' ok ' }, 'ref');
    expect(grade).toEqual({
      score: 100,
      verdict: 'correct',
      coveredPoints: ['a'],
      missedPoints: ['1', '2', '3', '4', '5', '6'],
      incorrectClaims: [],
      explanation: 'ok',
      referenceAnswer: 'ref',
      skipped: false,
    });
  });

  test('skippedGrade() is a zero incorrect grade', () => {
    expect(skippedGrade('ref')).toMatchObject({ score: 0, verdict: 'incorrect', skipped: true, referenceAnswer: 'ref' });
  });
});

describe('filterQuestionsByScope()', () => {
  const questions = [q('a1', 'a'), q('a2', 'a'), q('b1', 'b', 'ai-engineering'), q('c1', 'c')];

  test.each([
    { scope: { kind: 'all' as const }, expected: ['a1', 'a2', 'b1', 'c1'] },
    { scope: { kind: 'all' as const, readOnly: true }, expected: ['a1', 'a2'] },
    { scope: { kind: 'guides' as const, guides: ['ai-engineering' as const] }, expected: ['b1'] },
    { scope: { kind: 'lessons' as const, biteIds: ['c', 'b'] }, expected: ['b1', 'c1'] },
  ])('$scope', ({ scope, expected }) => {
    expect(filterQuestionsByScope(questions, scope, new Set(['a'])).map((x) => x.id)).toEqual(expected);
  });
});

describe('selectQuestion()', () => {
  const pool = [q('a', 'b'), q('b', 'b'), q('c', 'b')];

  test('returns null for an empty pool', () => {
    expect(selectQuestion({ pool: [], stats: [], recentQuestionIds: [], now: NOW })).toEqual(null);
  });

  test('prefers due weak questions when the roll is under the due weight', () => {
    const stats = [stat('a', 30, -1), stat('b', 90, -1)];
    expect(selectQuestion({ pool, stats, recentQuestionIds: [], now: NOW, random: () => 0.1 })?.id).toEqual('a');
  });

  test('otherwise picks a never-seen question', () => {
    const stats = [stat('a', 30, -1), stat('b', 90, -1)];
    expect(selectQuestion({ pool, stats, recentQuestionIds: [], now: NOW, random: () => 0.9 })?.id).toEqual('c');
  });

  test('never repeats a recent question when alternatives exist', () => {
    expect(selectQuestion({ pool, stats: [], recentQuestionIds: ['a', 'b'], now: NOW, random: () => 0 })?.id).toEqual('c');
  });

  test('when everything was asked recently, avoids only the last one', () => {
    expect(selectQuestion({ pool, stats: [], recentQuestionIds: ['a', 'b', 'c'], now: NOW, random: () => 0 })?.id).toEqual('b');
  });

  test('falls back to the stalest question', () => {
    const stats = [stat('a', 90, 30), stat('b', 90, 5), stat('c', 90, 10)];
    expect(selectQuestion({ pool, stats, recentQuestionIds: [], now: NOW, random: () => 0 })?.id).toEqual('b');
  });
});

describe('unlockedQuestions()', () => {
  const ladder = [q('e1', 'a', 'system-design', 'easy'), q('e2', 'a', 'system-design', 'easy'), q('m1', 'a', 'system-design', 'medium'), q('h1', 'a', 'system-design', 'hard')];
  const ids = (stats: PracticeQuestionStats[], pool = ladder) => unlockedQuestions(pool, new Map(stats.map((s) => [s.questionId, s]))).map((x) => x.id);

  test.each([
    { name: 'a new lesson opens only its easy tier', stats: [], expected: ['e1', 'e2'] },
    { name: 'one easy passed is not enough', stats: [stat('e1', 90, 7)], expected: ['e1', 'e2'] },
    { name: 'all easy passed opens medium', stats: [stat('e1', 90, 7), stat('e2', 85, 7)], expected: ['e1', 'e2', 'm1'] },
    { name: 'a failed easy question closes medium again', stats: [stat('e1', 90, 7), stat('e2', 40, 1), stat('m1', 90, 7)], expected: ['e1', 'e2'] },
    { name: 'medium passed opens hard', stats: [stat('e1', 90, 7), stat('e2', 85, 7), stat('m1', 80, 7)], expected: ['e1', 'e2', 'm1', 'h1'] },
    { name: 'a mastered lesson opens everything for review', stats: [stat('e1', 90, 7), stat('e2', 85, 7), stat('m1', 80, 7), stat('h1', 95, 7)], expected: ['e1', 'e2', 'm1', 'h1'] },
  ])('$name', ({ stats, expected }) => {
    expect(ids(stats)).toEqual(expected);
  });

  test('lessons climb independently', () => {
    const pool = [...ladder, q('x1', 'b', 'system-design', 'medium'), q('x2', 'b', 'system-design', 'hard')];
    expect(ids([stat('e1', 90, 7), stat('e2', 90, 7)], pool)).toEqual(['e1', 'e2', 'm1', 'x1']);
  });
});

describe('selectQuestion() ladder', () => {
  const pool = [q('e1', 'a', 'system-design', 'easy'), q('m1', 'a', 'system-design', 'medium'), q('h1', 'a', 'system-design', 'hard')];

  test('asks the easy question before any harder one', () => {
    expect(selectQuestion({ pool, stats: [], recentQuestionIds: [], now: NOW, random: () => 0.99 })?.id).toEqual('e1');
  });

  test('moves to medium once easy is passed', () => {
    expect(selectQuestion({ pool, stats: [stat('e1', 90, 7)], recentQuestionIds: ['e1'], now: NOW, random: () => 0.99 })?.id).toEqual('m1');
  });

  test('retries a failed question instead of moving up', () => {
    expect(selectQuestion({ pool, stats: [stat('e1', 30, -1)], recentQuestionIds: [], now: NOW, random: () => 0.99 })?.id).toEqual('e1');
  });
});
