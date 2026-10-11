import { describe, expect, it, test } from 'vitest';
import type { LogicPuzzle } from '../../../../src/shared/worldly/logic-puzzle';
import { createLogic, guessLogic, logicScore, logicShareText, randomLogicDay, revealedClues } from './logic';

const PUZZLE: LogicPuzzle = {
  day: '2026-03-01',
  difficulty: 'easy',
  number: 60,
  answer: 'PT',
  clues: [
    { kind: 'continent', continent: 'Europe' },
    { kind: 'border-count', count: 1 },
    { kind: 'borders', code: 'ES' },
    { kind: 'first-letter', letter: 'P' },
  ],
};

describe('guessLogic()', () => {
  it('should reveal one more clue per wrong guess', () => {
    let state = createLogic(PUZZLE);
    expect(revealedClues(state)).toHaveLength(1);
    state = guessLogic(state, 'FR');
    expect(revealedClues(state)).toHaveLength(2);
    expect(state.phase).toEqual('playing');
  });

  it('should ignore repeated guesses', () => {
    const state = guessLogic(createLogic(PUZZLE), 'FR');
    expect(guessLogic(state, 'FR')).toBe(state);
  });

  it('should win on the answer and reveal every clue', () => {
    const state = guessLogic(guessLogic(createLogic(PUZZLE), 'FR'), 'PT');
    expect(state.phase).toEqual('won');
    expect(revealedClues(state)).toHaveLength(4);
    expect(guessLogic(state, 'ES')).toBe(state);
  });

  it('should lose after six wrong guesses', () => {
    const state = createLogic(PUZZLE, ['FR', 'ES', 'IT', 'DE', 'GR', 'NL']);
    expect(state.phase).toEqual('lost');
    expect(revealedClues(state)).toHaveLength(4);
  });
});

describe('logicScore()', () => {
  test.each([
    { guesses: ['PT'], expected: 6 },
    { guesses: ['FR', 'ES', 'PT'], expected: 4 },
    { guesses: ['FR', 'ES', 'IT', 'DE', 'GR', 'NL'], expected: 0 },
  ])('should score $expected for $guesses', ({ guesses, expected }) => {
    expect(logicScore(createLogic(PUZZLE, guesses))).toEqual(expected);
  });
});

describe('logicShareText()', () => {
  it('should show the guess pattern', () => {
    expect(logicShareText(createLogic(PUZZLE, ['FR', 'PT']))).toEqual('🧩 Earth Logic #60 · Easy 2/6\n🟥🟩');
    expect(logicShareText(createLogic(PUZZLE, ['FR', 'ES', 'IT', 'DE', 'GR', 'NL']))).toEqual('🧩 Earth Logic #60 · Easy X/6\n🟥🟥🟥🟥🟥🟥');
  });
});

describe('randomLogicDay()', () => {
  test.each([
    { random: 0, expected: '2026-01-01' },
    { random: 0.5, expected: '2030-12-31' },
    { random: 0.9999, expected: '2035-12-29' },
  ])('should return $expected when random is $random', ({ random, expected }) => {
    expect(randomLogicDay(() => random)).toEqual(expected);
  });
});
