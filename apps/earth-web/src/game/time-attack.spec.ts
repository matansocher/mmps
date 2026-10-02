import { describe, expect, it } from 'vitest';
import { answer, createTimeAttack, currentTarget, PENALTY_MS, score, tick, TIME_ATTACK_MS, timeLeft } from './time-attack';

const POOL = ['CA', 'FR', 'BR', 'JP', 'EG'];
const T0 = 1_000_000;

describe('time attack', () => {
  it('should start with the full clock and every country queued', () => {
    const game = createTimeAttack(POOL, T0);
    expect(timeLeft(game, T0)).toEqual(TIME_ATTACK_MS);
    expect([...game.queue].sort()).toEqual([...POOL].sort());
  });

  it('should move on after a correct answer without a penalty', () => {
    const game = createTimeAttack(POOL, T0);
    const after = answer(game, currentTarget(game), T0 + 1000);
    expect(score(after)).toEqual(1);
    expect(after.index).toEqual(1);
    expect(after.endsAt).toEqual(game.endsAt);
  });

  it('should cost time for a wrong answer or a skip', () => {
    const game = createTimeAttack(POOL, T0);
    const after = answer(answer(game, 'XX', T0), null, T0);
    expect(after.endsAt).toEqual(game.endsAt - 2 * PENALTY_MS);
    expect(after.answers.map((a) => a.correct)).toEqual([false, false]);
    expect(score(after)).toEqual(0);
  });

  it('should finish when the clock runs out', () => {
    const game = createTimeAttack(POOL, T0);
    expect(tick(game, T0 + TIME_ATTACK_MS - 1).phase).toEqual('playing');
    expect(tick(game, T0 + TIME_ATTACK_MS).phase).toEqual('finished');
  });

  it('should finish when a penalty empties the clock', () => {
    const game = createTimeAttack(POOL, T0);
    const after = answer(game, 'XX', T0 + TIME_ATTACK_MS - PENALTY_MS + 1);
    expect(after.phase).toEqual('finished');
    expect(timeLeft(after, T0 + TIME_ATTACK_MS - PENALTY_MS + 1)).toEqual(0);
  });

  it('should ignore answers after the clock runs out', () => {
    const game = createTimeAttack(POOL, T0);
    const after = answer(game, currentTarget(game), T0 + TIME_ATTACK_MS + 1);
    expect(after.phase).toEqual('finished');
    expect(after.answers).toEqual([]);
  });

  it('should finish when every country has been asked', () => {
    let game = createTimeAttack(['CA', 'FR'], T0);
    game = answer(game, currentTarget(game), T0);
    game = answer(game, currentTarget(game), T0);
    expect(game.phase).toEqual('finished');
    expect(score(game)).toEqual(2);
  });
});
