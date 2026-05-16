import { computeNewStreak, isAnswerCorrect, isFillInCorrect, normalizeFillInAnswer } from './session-engine';
import { LEVELS, Question, QUESTION_TYPES, TOPICS } from './types';

describe('normalizeFillInAnswer()', () => {
  test.each([
    { input: 'Object', expected: 'object' },
    { input: '  object  ', expected: 'object' },
    { input: '"object"', expected: 'object' },
    { input: '`object`', expected: 'object' },
    { input: '"  Object  "', expected: 'object' },
  ])('normalizes $input → $expected', ({ input, expected }) => {
    expect(normalizeFillInAnswer(input)).toEqual(expected);
  });
});

describe('isFillInCorrect()', () => {
  it('matches case-insensitively', () => {
    expect(isFillInCorrect('OBJECT', ['object'])).toBe(true);
  });
  it('matches with surrounding quotes', () => {
    expect(isFillInCorrect('"object"', ['object'])).toBe(true);
  });
  it('returns false on mismatch', () => {
    expect(isFillInCorrect('string', ['object'])).toBe(false);
  });
  it('accepts any of multiple accepted answers', () => {
    expect(isFillInCorrect('nil', ['null', 'nil'])).toBe(true);
  });
});

describe('isAnswerCorrect()', () => {
  const mcQuestion: Question = {
    topic: TOPICS.JAVASCRIPT,
    level: LEVELS.BEGINNER,
    type: QUESTION_TYPES.MULTIPLE_CHOICE,
    question: 'q',
    options: ['a', 'b', 'c'],
    correctOptionIndex: 1,
    explanation: 'e',
  };
  const fillInQuestion: Question = {
    topic: TOPICS.JAVASCRIPT,
    level: LEVELS.BEGINNER,
    type: QUESTION_TYPES.FILL_IN,
    question: 'q',
    acceptedAnswers: ['object'],
    explanation: 'e',
  };

  it('MC correct when selectedOption matches', () => {
    expect(isAnswerCorrect(mcQuestion, { selectedOption: 1 })).toBe(true);
  });
  it('MC wrong on mismatch', () => {
    expect(isAnswerCorrect(mcQuestion, { selectedOption: 0 })).toBe(false);
  });
  it('MC wrong on missing selectedOption', () => {
    expect(isAnswerCorrect(mcQuestion, {})).toBe(false);
  });
  it('fill-in correct on text match', () => {
    expect(isAnswerCorrect(fillInQuestion, { text: 'object' })).toBe(true);
  });
  it('fill-in wrong on missing text', () => {
    expect(isAnswerCorrect(fillInQuestion, {})).toBe(false);
  });
});

describe('computeNewStreak()', () => {
  it('starts at 1 when no lastPlayedAt', () => {
    expect(computeNewStreak(0, undefined)).toEqual({ newStreak: 1, isNewDay: true });
  });
  it('keeps streak when last played today', () => {
    const today = new Date();
    expect(computeNewStreak(5, today)).toEqual({ newStreak: 5, isNewDay: false });
  });
  it('increments streak when last played yesterday', () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    expect(computeNewStreak(5, yesterday)).toEqual({ newStreak: 6, isNewDay: true });
  });
  it('resets streak to 1 when gap > 1 day', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    expect(computeNewStreak(10, threeDaysAgo)).toEqual({ newStreak: 1, isNewDay: true });
  });
});
