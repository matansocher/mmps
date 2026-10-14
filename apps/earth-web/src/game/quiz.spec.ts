import { describe, expect, it } from 'vitest';
import { answer, createQuiz, currentTarget, lastAnswer, next, pickQuestions, score, skip } from './quiz';

const POOL = ['CA', 'FR', 'BR', 'JP', 'EG'];
const first = () => 0; // Deterministic shuffle

describe('pickQuestions()', () => {
  it('should pick unique questions from the pool', () => {
    const questions = pickQuestions([...POOL, 'CA'], 10);
    expect(questions).toHaveLength(5);
    expect(new Set(questions).size).toEqual(5);
    expect([...questions].sort()).toEqual([...POOL].sort());
  });

  it('should cap the round at the requested size', () => {
    expect(pickQuestions(POOL, 3, first)).toHaveLength(3);
  });
});

describe('quiz', () => {
  it('should throw on an empty pool', () => {
    expect(() => createQuiz([])).toThrow();
  });

  it('should score a correct answer and move on', () => {
    let quiz = createQuiz(POOL, 2, first);
    const target = currentTarget(quiz)!;
    quiz = answer(quiz, target);
    expect(quiz.phase).toEqual('answered');
    expect(lastAnswer(quiz)).toEqual({ target, guess: target, correct: true });
    expect(score(quiz)).toEqual(1);
    quiz = next(quiz);
    expect(quiz.phase).toEqual('asking');
    expect(quiz.index).toEqual(1);
  });

  it('should record wrong answers and skips without scoring', () => {
    let quiz = createQuiz(POOL, 2, first);
    const wrong = POOL.find((code) => code !== currentTarget(quiz))!;
    quiz = next(answer(quiz, wrong));
    quiz = skip(quiz);
    expect(quiz.answers.map((a) => [a.guess, a.correct])).toEqual([
      [wrong, false],
      [null, false],
    ]);
    expect(score(quiz)).toEqual(0);
  });

  it('should allow only one answer per question', () => {
    const quiz = createQuiz(POOL, 2, first);
    const answered = answer(quiz, 'XX');
    expect(answer(answered, currentTarget(quiz))).toBe(answered);
    expect(skip(answered)).toBe(answered);
  });

  it('should not advance before answering', () => {
    const quiz = createQuiz(POOL, 2, first);
    expect(next(quiz)).toBe(quiz);
  });

  it('should finish after the last question', () => {
    let quiz = createQuiz(POOL, 1, first);
    quiz = next(answer(quiz, currentTarget(quiz)));
    expect(quiz.phase).toEqual('finished');
    expect(currentTarget(quiz)).toBeNull();
    expect(score(quiz)).toEqual(1);
  });
});
