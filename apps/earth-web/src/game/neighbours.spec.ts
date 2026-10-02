import { describe, expect, it } from 'vitest';
import { classifyGuess, createNeighbours, currentQuestion, giveUp, guess, MAX_MISSES, maxScore, next, score } from './neighbours';

const POOL = [
  { code: 'DE', neighbours: ['AT', 'CH', 'FR'] },
  { code: 'ES', neighbours: ['FR', 'PT'] },
];
const first = () => 0; // Deterministic shuffle

const start = () => createNeighbours(POOL, 1, first);

describe('neighbours', () => {
  it('should classify guesses', () => {
    const question = currentQuestion(guess(start(), 'FR'))!;
    expect(classifyGuess(question, question.center)).toEqual('center');
    expect(classifyGuess(question, 'FR')).toEqual('repeat');
    expect(
      classifyGuess(
        question,
        question.neighbours.find((c) => c !== 'FR')!,
      ),
    ).toEqual('hit');
    expect(classifyGuess(question, 'JP')).toEqual('miss');
  });

  it('should complete the question once every neighbour is found', () => {
    let game = start();
    for (const code of currentQuestion(game)!.neighbours) game = guess(game, code);
    expect(game.phase).toEqual('answered');
    expect(score(game)).toEqual(maxScore(game));
  });

  it('should end the question after too many misses', () => {
    let game = start();
    ['JP', 'BR', 'CA'].slice(0, MAX_MISSES).forEach((code) => (game = guess(game, code)));
    expect(game.phase).toEqual('answered');
    expect(currentQuestion(game)!.misses).toHaveLength(MAX_MISSES);
  });

  it('should ignore the center country and repeated guesses', () => {
    const game = guess(start(), 'JP');
    expect(guess(game, 'JP')).toBe(game);
    expect(guess(game, currentQuestion(game)!.center)).toBe(game);
  });

  it('should let the player give up and move to the next question', () => {
    let game = createNeighbours(POOL, 2, first);
    game = next(giveUp(game));
    expect(game.phase).toEqual('asking');
    expect(game.index).toEqual(1);
    game = next(giveUp(game));
    expect(game.phase).toEqual('finished');
    expect(currentQuestion(game)).toBeNull();
  });

  it('should throw on an empty pool', () => {
    expect(() => createNeighbours([])).toThrow();
  });
});
