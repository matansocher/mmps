import { ObjectId } from 'mongodb';
import { LEARNER_QUESTIONS } from '../learner-questions';
import type { PracticeAttempt } from '../types';
import { skippedGrade } from './practice-grading';
import { parseScope, toAttemptDto, toScopeResponse } from './practice.dto';

const question = LEARNER_QUESTIONS[0];

function attempt(overrides: Partial<PracticeAttempt> = {}): PracticeAttempt {
  return {
    _id: new ObjectId(),
    telegramUserId: 1,
    questionId: question.id,
    biteId: question.biteId,
    scope: { kind: 'all' },
    status: 'awaiting_answer',
    messages: [],
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('parseScope()', () => {
  test.each([
    { input: null, expected: null },
    { input: { kind: 'nope' }, expected: null },
    { input: { kind: 'all' }, expected: { kind: 'all', readOnly: false } },
    { input: { kind: 'all', readOnly: true }, expected: { kind: 'all', readOnly: true } },
    { input: { kind: 'guides', guides: ['ai-engineering', 'bogus', 'ai-engineering'] }, expected: { kind: 'guides', guides: ['ai-engineering'], readOnly: false } },
    { input: { kind: 'guides', guides: ['bogus'] }, expected: null },
    { input: { kind: 'lessons', biteIds: [question.biteId, 'missing:lesson', 7] }, expected: { kind: 'lessons', biteIds: [question.biteId] } },
    { input: { kind: 'lessons', biteIds: [] }, expected: null },
  ])('should parse $input', ({ input, expected }) => {
    expect(parseScope(input)).toEqual(expected);
  });
});

describe('toAttemptDto()', () => {
  test('should hide the lesson while awaiting an answer', () => {
    const dto = toAttemptDto(attempt());
    expect(dto.question).toEqual({ id: question.id, text: question.question, guide: question.guide, difficulty: question.difficulty, biteId: null, lessonTitle: null });
    expect(dto.grade).toEqual(null);
  });

  test('should reveal the lesson and grade once graded', () => {
    const grade = skippedGrade(question.referenceAnswer);
    const dto = toAttemptDto(attempt({ status: 'graded', grade, answer: '', gradedAt: new Date('2025-01-01T00:01:00Z') }));
    expect(dto.question.biteId).toEqual(question.biteId);
    expect(dto.question.lessonTitle).toEqual(question.lessonTitle);
    expect(dto.grade).toEqual(grade);
    expect(dto.gradedAt).toEqual('2025-01-01T00:01:00.000Z');
  });
});

describe('toScopeResponse()', () => {
  test('should aggregate per-lesson and total stats', () => {
    const now = new Date('2025-01-10T00:00:00Z');
    const base = { telegramUserId: 1, biteId: question.biteId, attempts: 1, bestScore: 0, streak: 0, lastAttemptAt: now };
    const response = toScopeResponse(
      [
        { ...base, _id: 'a', questionId: question.id, lastScore: 40, dueAt: new Date('2025-01-09T00:00:00Z') },
        { ...base, _id: 'b', questionId: 'unknown', lastScore: 90, dueAt: now },
      ],
      now,
    );
    expect(response.totals).toEqual({ questions: LEARNER_QUESTIONS.length, attempted: 1, mastered: 0, due: 1 });
    const lesson = response.lessons.find((l) => l.id === question.biteId);
    expect(lesson?.attempted).toEqual(1);
    expect(lesson?.averageScore).toEqual(40);
    expect(response.guides.reduce((sum, g) => sum + g.questionCount, 0)).toEqual(LEARNER_QUESTIONS.length);
  });
});
